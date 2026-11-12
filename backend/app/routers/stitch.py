from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Post, Interest, StitchProject, StitchContribution, ModerationLog
from app.schemas import (
    StitchProjectCreate, StitchContributionCreate, 
    StitchProjectOut, StitchContributionOut, StitchPublishIn, PostOut
)
from app.security import get_current_user
from app.services.video_stitcher import stitch_video_clips, check_ffmpeg

router = APIRouter(prefix="/stitch", tags=["Stitch Studio"])

def format_project_out(p: StitchProject) -> StitchProjectOut:
    return StitchProjectOut(
        id=p.id,
        title=p.title,
        description=p.description,
        creator_id=p.creator_id,
        creator_username=p.creator.username if p.creator else "creator",
        status=p.status,
        final_video_url=p.final_video_url,
        contributions=[
            StitchContributionOut(
                id=c.id,
                project_id=c.project_id,
                user_id=c.user_id,
                username=c.user.username if c.user else "contributor",
                avatar_url=c.user.avatar_url if c.user else None,
                video_url=c.video_url,
                caption=c.caption,
                consent_given=c.consent_given,
                status=c.status,
                moderator_feedback=c.moderator_feedback,
                order_index=c.order_index,
                created_at=c.created_at
            )
            for c in p.contributions
        ],
        created_at=p.created_at
    )

@router.get("/projects", response_model=List[StitchProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(StitchProject).order_by(desc(StitchProject.created_at)).all()
    return [format_project_out(p) for p in projects]

@router.post("/projects", response_model=StitchProjectOut)
def create_project(
    proj_in: StitchProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.account_type == "child":
        raise HTTPException(status_code=403, detail="Child accounts cannot initiate public stitch projects.")

    new_project = StitchProject(
        title=proj_in.title,
        description=proj_in.description,
        creator_id=current_user.id,
        status="collecting"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return format_project_out(new_project)

@router.post("/projects/{project_id}/contributions", response_model=StitchContributionOut)
def submit_contribution(
    project_id: int,
    contrib_in: StitchContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(StitchProject).filter(StitchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Stitch project not found.")

    if not contrib_in.consent_given:
        raise HTTPException(status_code=400, detail="Consent for clip inclusion and video stitching is mandatory.")

    # Determine next order index
    next_order = len(project.contributions) + 1

    new_contrib = StitchContribution(
        project_id=project_id,
        user_id=current_user.id,
        video_url=contrib_in.video_url,
        caption=contrib_in.caption,
        consent_given=contrib_in.consent_given,
        status="pending", # requires moderator approval
        order_index=next_order
    )
    db.add(new_contrib)
    db.commit()
    db.refresh(new_contrib)

    return StitchContributionOut(
        id=new_contrib.id,
        project_id=new_contrib.project_id,
        user_id=new_contrib.user_id,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        video_url=new_contrib.video_url,
        caption=new_contrib.caption,
        consent_given=new_contrib.consent_given,
        status=new_contrib.status,
        moderator_feedback=new_contrib.moderator_feedback,
        order_index=new_contrib.order_index,
        created_at=new_contrib.created_at
    )

@router.put("/contributions/{contribution_id}/status")
def review_contribution(
    contribution_id: int,
    status: str, # approved, rejected
    feedback: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contrib = db.query(StitchContribution).filter(StitchContribution.id == contribution_id).first()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution not found.")

    # Project owner or platform moderator can approve
    if not (current_user.id == contrib.project.creator_id or current_user.is_moderator or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Only project creator or moderator can review clips.")

    contrib.status = status
    contrib.moderator_feedback = feedback
    db.commit()

    return {"message": f"Contribution marked as {status}.", "status": status}

@router.post("/projects/{project_id}/render", response_model=StitchProjectOut)
def render_stitched_video(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stitches all approved video clips using FFmpeg and sets final video.
    """
    project = db.query(StitchProject).filter(StitchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Stitch project not found.")

    approved_clips = [
        c.video_url for c in project.contributions if c.status == "approved"
    ]

    if not approved_clips:
        raise HTTPException(
            status_code=400,
            detail="No approved contributions to stitch. Please approve clips first."
        )

    project.status = "stitching"
    db.commit()

    success, final_url, err = stitch_video_clips(project_id, approved_clips)

    if success:
        project.final_video_url = final_url
        project.status = "completed"
    else:
        project.status = "collecting"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to stitch video with FFmpeg: {err}")

    db.commit()
    db.refresh(project)

    # Log action
    log = ModerationLog(
        moderator_id=current_user.id,
        entity_type="stitch_project",
        entity_id=project.id,
        action="stitched",
        previous_state="collecting",
        new_state="completed",
        reason=f"Stitched {len(approved_clips)} approved clips."
    )
    db.add(log)
    db.commit()

    return format_project_out(project)

@router.post("/projects/{project_id}/publish", response_model=PostOut)
def publish_stitched_video(
    project_id: int,
    publish_in: StitchPublishIn = StitchPublishIn(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows the project head/creator or group/platform admin to publish the final
    stitched video as a public post on their profile and feed.
    """
    project = db.query(StitchProject).filter(StitchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Stitch project not found.")

    if not (current_user.id == project.creator_id or current_user.is_admin or current_user.is_moderator):
        raise HTTPException(status_code=403, detail="Only the project creator/head or an admin can publish the final stitched video.")

    if not project.final_video_url:
        raise HTTPException(status_code=400, detail="Render the stitched video before publishing.")

    interest_id = publish_in.interest_id
    if not interest_id:
        default_interest = db.query(Interest).filter(Interest.slug == "art").first() or db.query(Interest).first()
        interest_id = default_interest.id if default_interest else 1

    caption_text = (publish_in.caption or "").strip() or f"{project.title} — Collaborative Stitch Video 🎬"

    new_post = Post(
        user_id=current_user.id,
        content_type="video",
        media_url=project.final_video_url,
        caption=caption_text,
        interest_id=interest_id,
        audience=publish_in.audience or "public",
        is_ai_generated=False,
        is_flagged=False,
        moderation_status="approved",
        under_review_badge=False,
        likes_count=0,
        comments_count=0,
        views_count=1
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return PostOut(
        id=new_post.id,
        user_id=new_post.user_id,
        author_username=current_user.username,
        author_display_name=current_user.display_name,
        author_avatar=current_user.avatar_url,
        author_is_verified=current_user.is_verified,
        content_type=new_post.content_type,
        media_url=new_post.media_url,
        caption=new_post.caption,
        location=None,
        interest_id=new_post.interest_id,
        interest_name=new_post.interest.name if new_post.interest else "Art",
        interest_gradient=new_post.interest.gradient if new_post.interest else "from-pink-500 to-rose-500",
        community_id=new_post.community_id,
        community_name=None,
        audience=new_post.audience,
        is_ai_generated=False,
        ai_label_explanation=None,
        is_flagged=False,
        flag_reason=None,
        moderation_status=new_post.moderation_status,
        under_review_badge=False,
        likes_count=0,
        comments_count=0,
        has_liked=False,
        has_saved=False,
        created_at=new_post.created_at,
        recommendation_reason="Published from Stitch Studio"
    )
