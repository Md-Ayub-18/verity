from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Post, Comment, Reaction, HidePost, Report, ModerationLog
from app.schemas import PostCreate, PostOut, CommentCreate, CommentOut, ReportCreate
from app.security import get_current_user
from app.services.feed_service import get_feed_posts, format_posts
from app.services.ai_moderation import analyze_content
from app.routers.notifications import create_notification

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.get("/feed", response_model=List[PostOut])
def get_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the feed dynamically:
    - Focus Mode OFF -> prioritized interests + 30% discovery
    - Focus Mode ON -> strict filtering by mode's selected interests
    - Kids Mode -> strictly child-safe Learning and Art content
    """
    return get_feed_posts(db=db, current_user=current_user, page=page, limit=limit)

@router.get("/saved", response_model=List[PostOut])
def get_saved_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns posts saved by the authenticated user."""
    saved_ids = [
        r.post_id for r in db.query(Reaction).filter(
            Reaction.user_id == current_user.id,
            Reaction.reaction_type == "save",
            Reaction.post_id.isnot(None)
        ).order_by(Reaction.created_at.desc()).all()
    ]
    if not saved_ids:
        return []
    posts = db.query(Post).filter(
        Post.id.in_(saved_ids),
        Post.moderation_status == "approved",
        Post.is_flagged == False
    ).all()
    return format_posts(posts, current_user, "Saved by you")

@router.post("", response_model=PostOut)
def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new post with content analysis & moderation:
    - Scans for toxicity, spam, child safety
    - Detects synthetic AI markers or respects manual AI-content disclosure
    """
    is_child = current_user.account_type == "child"
    if is_child and post_in.content_type == "video":
        raise HTTPException(status_code=403, detail="Child accounts cannot upload unapproved video content.")

    analysis = analyze_content(post_in.caption or "", is_child_author=is_child)

    is_ai = post_in.is_ai_generated or analysis["is_ai_generated"]
    ai_explanation = post_in.ai_label_explanation or analysis["ai_label_explanation"]
    if is_ai and not ai_explanation:
        ai_explanation = "Creator declared this content as AI-generated."

    new_post = Post(
        user_id=current_user.id,
        content_type=post_in.content_type,
        media_url=post_in.media_url,
        caption=post_in.caption,
        location=post_in.location,
        interest_id=post_in.interest_id,
        community_id=post_in.community_id,
        audience=post_in.audience,
        is_ai_generated=is_ai,
        ai_label_explanation=ai_explanation,
        is_flagged=analysis["is_flagged"],
        flag_reason=analysis["flag_reason"],
        moderation_status=analysis["moderation_status"],
        under_review_badge=analysis["is_flagged"],
        likes_count=0,
        comments_count=0,
        views_count=1
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # If flagged by automated pipeline, log to ModerationLog
    if analysis["is_flagged"]:
        log_entry = ModerationLog(
            moderator_id=None,
            entity_type="post",
            entity_id=new_post.id,
            action="flagged",
            previous_state="submitted",
            new_state="pending_review",
            reason=f"Automated AI Safety Filter: {analysis['flag_reason']}"
        )
        db.add(log_entry)
        db.commit()

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
        location=new_post.location,
        interest_id=new_post.interest_id,
        interest_name=new_post.interest.name if new_post.interest else "General",
        interest_gradient=new_post.interest.gradient if new_post.interest else "from-pink-500 to-rose-500",
        community_id=new_post.community_id,
        community_name=new_post.community.name if new_post.community else None,
        audience=new_post.audience,
        is_ai_generated=new_post.is_ai_generated,
        ai_label_explanation=new_post.ai_label_explanation,
        is_flagged=new_post.is_flagged,
        flag_reason=new_post.flag_reason,
        moderation_status=new_post.moderation_status,
        under_review_badge=new_post.under_review_badge,
        likes_count=new_post.likes_count,
        comments_count=new_post.comments_count,
        has_liked=False,
        has_saved=False,
        created_at=new_post.created_at,
        recommendation_reason="Created by you"
    )

@router.post("/{post_id}/like")
def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    existing = db.query(Reaction).filter(
        Reaction.user_id == current_user.id,
        Reaction.post_id == post_id,
        Reaction.reaction_type == "like"
    ).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        new_reaction = Reaction(
            user_id=current_user.id,
            post_id=post_id,
            reaction_type="like"
        )
        db.add(new_reaction)
        post.likes_count += 1
        liked = True
        create_notification(
            db, post.user_id, current_user.id, "like",
            f"@{current_user.username} liked your post.", "post", post.id
        )

    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}

@router.post("/{post_id}/save")
def toggle_save(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    existing = db.query(Reaction).filter(
        Reaction.user_id == current_user.id,
        Reaction.post_id == post_id,
        Reaction.reaction_type == "save"
    ).first()

    if existing:
        db.delete(existing)
        saved = False
    else:
        new_reaction = Reaction(
            user_id=current_user.id,
            post_id=post_id,
            reaction_type="save"
        )
        db.add(new_reaction)
        saved = True

    db.commit()
    return {"saved": saved}

@router.post("/{post_id}/hide")
def hide_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(HidePost).filter(
        HidePost.user_id == current_user.id,
        HidePost.post_id == post_id
    ).first()
    if not existing:
        hp = HidePost(user_id=current_user.id, post_id=post_id)
        db.add(hp)
        db.commit()
    return {"hidden": True}

@router.get("/{post_id}/comments", response_model=List[CommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.is_flagged == False
    ).order_by(Comment.created_at.asc()).all()

    result = []
    for c in comments:
        result.append(CommentOut(
            id=c.id,
            user_id=c.user_id,
            username=c.user.username,
            display_name=c.user.display_name,
            avatar_url=c.user.avatar_url,
            text=c.text,
            is_flagged=c.is_flagged,
            created_at=c.created_at
        ))
    return result

@router.post("/{post_id}/comments", response_model=CommentOut)
def add_comment(
    post_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    analysis = analyze_content(comment_in.text, is_child_author=current_user.account_type == "child")

    new_comment = Comment(
        user_id=current_user.id,
        post_id=post_id,
        text=comment_in.text,
        is_flagged=analysis["is_flagged"]
    )
    db.add(new_comment)
    post.comments_count += 1
    if not analysis["is_flagged"]:
        create_notification(
            db, post.user_id, current_user.id, "comment",
            f"@{current_user.username} commented: \"{comment_in.text[:40]}\"", "post", post.id
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

@router.post("/{post_id}/report")
def report_post(
    post_id: int,
    report_in: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    new_report = Report(
        reporter_id=current_user.id,
        post_id=post_id,
        reported_user_id=post.user_id,
        reason=report_in.reason,
        description=report_in.description,
        status="pending"
    )
    db.add(new_report)
    post.is_flagged = True
    post.under_review_badge = True
    db.commit()

    return {"message": "Thank you. Your report has been submitted for moderator review.", "status": "pending"}
