from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import User, FocusMode, Interest
from app.schemas import FocusModeOut, FocusModeCreate, FocusModeUpdate
from app.security import get_current_user

router = APIRouter(prefix="/focus-modes", tags=["Focus Modes"])

@router.get("", response_model=List[FocusModeOut])
def list_focus_modes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List system default focus modes + user's custom focus modes"""
    modes = db.query(FocusMode).filter(
        or_(FocusMode.is_system_default == True, FocusMode.user_id == current_user.id)
    ).order_by(FocusMode.is_system_default.desc(), FocusMode.id).all()
    
    result = []
    for m in modes:
        result.append(FocusModeOut(
            id=m.id,
            name=m.name,
            emoji=m.emoji,
            description=m.description,
            is_system_default=m.is_system_default,
            is_active=m.is_active,
            selected_interest_ids=m.selected_interest_ids,
            focus_duration_minutes=m.focus_duration_minutes
        ))
    return result

@router.post("", response_model=FocusModeOut)
def create_focus_mode(
    mode_in: FocusModeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom focus mode"""
    if current_user.account_type == "child":
        raise HTTPException(status_code=403, detail="Child accounts cannot create unrestricted custom focus modes.")
    if not mode_in.selected_interest_ids:
        raise HTTPException(status_code=400, detail="Select at least one interest for this focus mode.")

    new_mode = FocusMode(
        user_id=current_user.id,
        name=mode_in.name,
        emoji=mode_in.emoji or "🎯",
        description=mode_in.description,
        is_system_default=False,
        is_active=False,
        focus_duration_minutes=mode_in.focus_duration_minutes or 45
    )
    new_mode.selected_interest_ids = mode_in.selected_interest_ids

    db.add(new_mode)
    db.commit()
    db.refresh(new_mode)

    return FocusModeOut(
        id=new_mode.id,
        name=new_mode.name,
        emoji=new_mode.emoji,
        description=new_mode.description,
        is_system_default=new_mode.is_system_default,
        is_active=new_mode.is_active,
        selected_interest_ids=new_mode.selected_interest_ids,
        focus_duration_minutes=new_mode.focus_duration_minutes
    )

@router.put("/{mode_id}/toggle", response_model=List[FocusModeOut])
def toggle_focus_mode(
    mode_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activates a focus mode (and deactivates all others), or turns it off if already active.
    Child accounts are locked in Kids Mode.
    """
    target_mode = db.query(FocusMode).filter(FocusMode.id == mode_id).first()
    if not target_mode:
        raise HTTPException(status_code=404, detail="Focus mode not found.")

    if current_user.account_type == "child":
        # Child account is permanently locked in Kids Mode
        if "Kids" not in target_mode.name:
            raise HTTPException(
                status_code=403,
                detail="Child accounts are strictly limited to Kids Focus Mode."
            )

    will_be_active = not target_mode.is_active

    # Deactivate all focus modes for user/system
    all_modes = db.query(FocusMode).filter(
        or_(FocusMode.is_system_default == True, FocusMode.user_id == current_user.id)
    ).all()

    for m in all_modes:
        m.is_active = False

    target_mode.is_active = will_be_active
    db.commit()

    return list_focus_modes(current_user, db)

@router.delete("/{mode_id}")
def delete_focus_mode(
    mode_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = db.query(FocusMode).filter(
        FocusMode.id == mode_id,
        FocusMode.user_id == current_user.id
    ).first()
    
    if not target:
        raise HTTPException(status_code=404, detail="Custom focus mode not found or cannot delete default mode.")
        
    db.delete(target)
    db.commit()
    return {"message": "Focus mode removed successfully."}
