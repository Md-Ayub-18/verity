from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Reel, Comment, Reaction, Report
from app.schemas import ReelCreate, ReelOut, CommentCreate, CommentOut, ReportCreate
from app.security import get_current_user
from app.services.feed_service import get_feed_reels
from app.services.ai_moderation import analyze_content
from app.services.video_stitcher import generate_video_thumbnail
from app.routers.notifications import create_notification

router = APIRouter(prefix="/reels", tags=["Reels"])

@router.get("/feed", response_model=List[ReelOut])
def get_reels(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dedicated Reels feed:
    - Focus Mode OFF -> prioritized interests + cross-discovery
    - Focus Mode ON -> strict filtering by mode's selected interests
    - Kids Mode -> only approved child-safe reels (Learning and Art)
    """
    return get_feed_reels(db=db, current_user=current_user, limit=limit)

@router.post("", response_model=ReelOut)
def create_reel(
    reel_in: ReelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_child = current_user.account_type == "child"
    if is_child:
        raise HTTPException(status_code=403, detail="Child accounts cannot upload direct public reels.")

    analysis = analyze_content(reel_in.caption or "", is_child_author=False)

    is_ai = reel_in.is_ai_generated or analysis["is_ai_generated"]
    ai_explanation = reel_in.ai_label_explanation or analysis["ai_label_explanation"]
    if is_ai and not ai_explanation:
        ai_explanation = "Creator declared this reel as AI-assisted."

    resolved_thumb = reel_in.thumbnail_url
    if not resolved_thumb:
        resolved_thumb = generate_video_thumbnail(reel_in.video_url, "reels") or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"

    new_reel = Reel(
        user_id=current_user.id,
        video_url=reel_in.video_url,
        thumbnail_url=resolved_thumb,
        caption=reel_in.caption,
        interest_id=reel_in.interest_id,
        audio_title=reel_in.audio_title or "Original Sound - Verity",
        is_ai_generated=is_ai,
        ai_label_explanation=ai_explanation,
        moderation_status=analysis["moderation_status"],
        is_child_approved=False, # needs moderator verification for child feed
        likes_count=0,
        comments_count=0,
        shares_count=0,
        saves_count=0,
        views_count=0,
        duration_seconds=30
    )

    db.add(new_reel)
    db.commit()
    db.refresh(new_reel)

    return ReelOut(
        id=new_reel.id,
        user_id=new_reel.user_id,
        author_username=current_user.username,
        author_display_name=current_user.display_name,
        author_avatar=current_user.avatar_url,
        author_is_verified=current_user.is_verified,
        is_following_author=False,
        video_url=new_reel.video_url,
        thumbnail_url=new_reel.thumbnail_url,
        caption=new_reel.caption,
        interest_id=new_reel.interest_id,
        interest_name=new_reel.interest.name if new_reel.interest else "General",
        interest_gradient=new_reel.interest.gradient if new_reel.interest else "from-pink-500 to-rose-500",
        audio_title=new_reel.audio_title,
        is_ai_generated=new_reel.is_ai_generated,
        ai_label_explanation=new_reel.ai_label_explanation,
        moderation_status=new_reel.moderation_status,
        is_child_approved=new_reel.is_child_approved,
        likes_count=0,
        comments_count=0,
        shares_count=0,
        saves_count=0,
        views_count=0,
        has_liked=False,
        has_saved=False,
        duration_seconds=new_reel.duration_seconds,
        created_at=new_reel.created_at,
        recommendation_reason="Created by you"
    )

@router.post("/{reel_id}/view")
def record_reel_view(
    reel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found.")
    reel.views_count = (reel.views_count or 0) + 1
    db.commit()
    return {"views_count": reel.views_count}

@router.post("/{reel_id}/like")
def toggle_reel_like(
    reel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found.")

    existing = db.query(Reaction).filter(
        Reaction.user_id == current_user.id,
        Reaction.reel_id == reel_id,
        Reaction.reaction_type == "like"
    ).first()

    if existing:
        db.delete(existing)
        reel.likes_count = max(0, reel.likes_count - 1)
        liked = False
    else:
        new_reaction = Reaction(
            user_id=current_user.id,
            reel_id=reel_id,
            reaction_type="like"
        )
        db.add(new_reaction)
        reel.likes_count += 1
        liked = True
        create_notification(
            db, reel.user_id, current_user.id, "like",
            f"@{current_user.username} liked your reel.", "reel", reel.id
        )

    db.commit()
    return {"liked": liked, "likes_count": reel.likes_count}

@router.post("/{reel_id}/save")
def toggle_reel_save(
    reel_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found.")

    existing = db.query(Reaction).filter(
        Reaction.user_id == current_user.id,
        Reaction.reel_id == reel_id,
        Reaction.reaction_type == "save"
    ).first()

    if existing:
        db.delete(existing)
        saved = False
    else:
        new_reaction = Reaction(
            user_id=current_user.id,
            reel_id=reel_id,
            reaction_type="save"
        )
        db.add(new_reaction)
        reel.saves_count += 1
        saved = True

    db.commit()
    return {"saved": saved}

@router.get("/{reel_id}/comments", response_model=List[CommentOut])
def get_reel_comments(reel_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(
        Comment.reel_id == reel_id,
        Comment.is_flagged == False
    ).order_by(Comment.created_at.asc()).all()

    return [
        CommentOut(
            id=c.id,
            user_id=c.user_id,
            username=c.user.username,
            display_name=c.user.display_name,
            avatar_url=c.user.avatar_url,
            text=c.text,
            is_flagged=c.is_flagged,
            created_at=c.created_at
        )
        for c in comments
    ]

@router.post("/{reel_id}/comments", response_model=CommentOut)
def add_reel_comment(
    reel_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found.")

    analysis = analyze_content(comment_in.text, is_child_author=current_user.account_type == "child")
    new_comment = Comment(
        user_id=current_user.id,
        reel_id=reel_id,
        text=comment_in.text,
        is_flagged=analysis["is_flagged"]
    )
    db.add(new_comment)
    reel.comments_count += 1
    if not analysis["is_flagged"]:
        create_notification(
            db, reel.user_id, current_user.id, "comment",
            f"@{current_user.username} commented on your reel: \"{comment_in.text[:40]}\"", "reel", reel.id
        )
    db.commit()
    db.refresh(new_comment)

    return CommentOut(
        id=new_comment.id,
        user_id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        text=new_comment.text,
        is_flagged=new_comment.is_flagged,
        created_at=new_comment.created_at
    )

@router.post("/{reel_id}/report")
def report_reel(
    reel_id: int,
    report_in: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found.")

    new_report = Report(
        reporter_id=current_user.id,
        reel_id=reel_id,
        reported_user_id=reel.user_id,
        reason=report_in.reason,
        description=report_in.description,
        status="pending"
    )
    db.add(new_report)
    db.commit()
    return {"message": "Reel reported for moderator review.", "status": "pending"}
