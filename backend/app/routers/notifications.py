from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Notification
from app.schemas import NotificationOut
from app.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def create_notification(
    db: Session,
    user_id: int,
    actor_id: Optional[int],
    n_type: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None
):
    """Helper to record a persistent notification in the database."""
    if actor_id and user_id == actor_id:
        return  # Do not notify users of their own self-actions
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=n_type,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False
    )
    db.add(notif)

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(50).all()

    return [
        NotificationOut(
            id=n.id,
            type=n.type,
            message=n.message,
            entity_type=n.entity_type,
            entity_id=n.entity_id,
            actor_username=n.actor.username if n.actor else None,
            actor_avatar=n.actor.avatar_url if n.actor else None,
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in items
    ]

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/{notif_id}/read")
def mark_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    n = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")
    n.is_read = True
    db.commit()
    return {"is_read": True}

@router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}

