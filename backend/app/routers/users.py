from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Post, Reel, Story, Follow, Block, Highlight
from app.schemas import BlockedUserOut, HighlightCreate, HighlightOut
from app.security import get_current_user
from app.services.feed_service import format_posts, format_reels
from app.routers.notifications import create_notification

router = APIRouter(prefix="/users", tags=["Users & Profiles"])

@router.post("/me/highlights", response_model=HighlightOut)
def create_highlight(
    highlight_in: HighlightCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_hl = Highlight(
        user_id=current_user.id,
        title=highlight_in.title.strip(),
        cover_url=highlight_in.cover_url,
        media_url=highlight_in.media_url or highlight_in.cover_url,
        media_type=highlight_in.media_type or "photo"
    )
    db.add(new_hl)
    db.commit()
    db.refresh(new_hl)
    return new_hl

@router.delete("/me/highlights/{highlight_id}")
def delete_highlight(
    highlight_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hl = db.query(Highlight).filter(
        Highlight.id == highlight_id,
        Highlight.user_id == current_user.id
    ).first()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found.")
    db.delete(hl)
    db.commit()
    return {"deleted": True}

@router.get("/me/blocked", response_model=List[BlockedUserOut])
def get_blocked_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    blocks = db.query(Block).filter(Block.blocker_id == current_user.id).all()
    blocked_ids = [b.blocked_id for b in blocks]
    if not blocked_ids:
        return []
    users = db.query(User).filter(User.id.in_(blocked_ids)).all()
    return [
        BlockedUserOut(
            id=u.id,
            username=u.username,
            display_name=u.display_name,
            avatar_url=u.avatar_url
        )
        for u in users
    ]

@router.get("/suggested")
def get_suggested_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns recommended creators to follow"""
    following_ids = [f.followed_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()]
    following_ids.append(current_user.id)

    users = db.query(User).filter(
        User.id.notin_(following_ids),
        User.account_type != "child"
    ).limit(8).all()

    result = []
    for u in users:
        posts_count = db.query(func.count(Post.id)).filter(Post.user_id == u.id).scalar()
        followers_count = db.query(func.count(Follow.id)).filter(Follow.followed_id == u.id).scalar()
        result.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "is_verified": u.is_verified,
            "posts_count": posts_count,
            "followers_count": followers_count,
            "category": u.interests[0].name if u.interests else "Creator"
        })
    return result

@router.get("/{username}")
def get_user_profile(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    # Block check
    is_blocked = db.query(Block).filter(
        ((Block.blocker_id == current_user.id) & (Block.blocked_id == target.id)) |
        ((Block.blocker_id == target.id) & (Block.blocked_id == current_user.id))
    ).first() is not None
    if is_blocked:
        raise HTTPException(status_code=403, detail="This profile is unavailable due to block settings.")

    is_following = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == target.id
    ).first() is not None

    followers_count = db.query(func.count(Follow.id)).filter(Follow.followed_id == target.id).scalar()
    following_count = db.query(func.count(Follow.id)).filter(Follow.follower_id == target.id).scalar()
    posts_count = db.query(func.count(Post.id)).filter(Post.user_id == target.id).scalar()

    is_private_locked = bool(target.is_private and not is_following and target.id != current_user.id)

    is_self = target.id == current_user.id
    if is_private_locked:
        posts = []
        reels = []
        stories = []
        highlights = []
    else:
        post_query = db.query(Post).filter(Post.user_id == target.id)
        if not is_self:
            # Other users NEVER see flagged, hate speech, misleading, harmful, or unapproved posts
            post_query = post_query.filter(
                Post.moderation_status == "approved",
                Post.is_flagged == False
            )
        posts = post_query.order_by(Post.created_at.desc(), Post.id.desc()).all()

        reels = db.query(Reel).filter(
            Reel.user_id == target.id,
            Reel.moderation_status == "approved"
        ).order_by(Reel.created_at.desc()).all()

        now = datetime.now(timezone.utc)
        stories = db.query(Story).filter(
            Story.user_id == target.id,
            Story.expires_at > now
        ).order_by(Story.created_at.asc()).all()

        highlights = db.query(Highlight).filter(
            Highlight.user_id == target.id
        ).order_by(Highlight.created_at.asc()).all()

    return {
        "id": target.id,
        "username": target.username,
        "display_name": target.display_name,
        "avatar_url": target.avatar_url,
        "bio": target.bio or "Living in the moment & creating content.",
        "is_verified": target.is_verified,
        "is_private": target.is_private,
        "is_private_locked": is_private_locked,
        "account_type": target.account_type,
        "followers_count": followers_count,
        "following_count": following_count,
        "posts_count": len(posts) if not is_private_locked else posts_count,
        "is_following": is_following,
        "is_self": is_self,
        "posts": format_posts(posts, current_user, f"Posted by @{target.username}"),
        "reels": format_reels(reels, current_user, f"Reel by @{target.username}"),
        "highlights": [
            {
                "id": h.id,
                "user_id": h.user_id,
                "title": h.title,
                "cover_url": h.cover_url,
                "media_url": h.media_url,
                "media_type": h.media_type,
                "created_at": h.created_at
            }
            for h in highlights
        ],
        "stories": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "author_username": target.username,
                "author_display_name": target.display_name,
                "author_avatar": target.avatar_url,
                "media_url": s.media_url,
                "media_type": s.media_type,
                "caption": s.caption,
                "is_live": s.is_live,
                "created_at": s.created_at,
                "expires_at": s.expires_at
            }
            for s in stories
        ]
    }

@router.post("/{user_id}/follow")
def toggle_follow(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        following = False
    else:
        new_follow = Follow(follower_id=current_user.id, followed_id=user_id)
        db.add(new_follow)
        following = True
        create_notification(
            db, user_id, current_user.id, "follow",
            f"@{current_user.username} started following you.", "user", current_user.id
        )

    db.commit()
    followers_count = db.query(func.count(Follow.id)).filter(Follow.followed_id == user_id).scalar()

    return {"following": following, "followers_count": followers_count}

@router.post("/{user_id}/block")
def toggle_block(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself.")

    existing = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        blocked = False
    else:
        new_block = Block(blocker_id=current_user.id, blocked_id=user_id)
        db.add(new_block)
        blocked = True

    db.commit()
    return {"blocked": blocked}
