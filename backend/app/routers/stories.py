from typing import List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Story, Interest
from app.schemas import StoryCreate, StoryOut
from app.security import get_current_user

router = APIRouter(prefix="/stories", tags=["Stories"])

@router.get("", response_model=List[StoryOut])
def get_stories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns active stories (expires_at > now).
    Respects child restrictions (only approved safe stories).
    """
    now = datetime.now(timezone.utc)
    query = db.query(Story).filter(Story.expires_at > now)

    is_child = current_user.account_type == "child" or current_user.is_kids_mode or current_user.kids_preview_mode
    if is_child:
        child_interests = db.query(Interest.id).filter(Interest.is_child_permitted == True).all()
        c_ids = [c[0] for c in child_interests]
        query = query.filter(Story.interest_id.in_(c_ids))

    stories = query.order_by(desc(Story.created_at)).all()

    result = []
    for s in stories:
        result.append(StoryOut(
            id=s.id,
            user_id=s.user_id,
            author_username=s.author.username if s.author else "creator",
            author_display_name=s.author.display_name if s.author else "Creator",
            author_avatar=s.author.avatar_url if s.author else None,
            media_url=s.media_url,
            media_type=s.media_type,
            caption=s.caption,
            is_live=s.is_live,
            created_at=s.created_at,
            expires_at=s.expires_at
        ))
    return result

@router.post("", response_model=StoryOut)
def create_story(
    story_in: StoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.account_type == "child":
        raise HTTPException(status_code=403, detail="Child accounts cannot post public stories.")

    now = datetime.now(timezone.utc)
    new_story = Story(
        user_id=current_user.id,
        media_url=story_in.media_url,
        media_type=story_in.media_type,
        caption=story_in.caption,
        interest_id=story_in.interest_id,
        is_live=story_in.is_live,
        expires_at=now + timedelta(hours=24),
        created_at=now
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)

    return StoryOut(
        id=new_story.id,
        user_id=new_story.user_id,
        author_username=current_user.username,
        author_display_name=current_user.display_name,
        author_avatar=current_user.avatar_url,
        media_url=new_story.media_url,
        media_type=new_story.media_type,
        caption=new_story.caption,
        is_live=new_story.is_live,
        created_at=new_story.created_at,
        expires_at=new_story.expires_at
    )
