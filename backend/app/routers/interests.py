from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Interest
from app.schemas import InterestOut, UserInterestsUpdate
from app.security import get_current_user

router = APIRouter(prefix="/interests", tags=["Interests"])

@router.get("", response_model=List[InterestOut])
def list_interests(db: Session = Depends(get_db)):
    """List the 7 primary interests available on Verity"""
    return db.query(Interest).order_by(Interest.id).all()

@router.get("/my", response_model=List[InterestOut])
def get_my_interests(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's selected interests"""
    return current_user.interests

@router.put("/my", response_model=List[InterestOut])
def update_my_interests(
    update_in: UserInterestsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's selected interests.
    Enforces child-safety: child accounts can ONLY select Learning and Art!
    """
    if not update_in.interest_ids:
        raise HTTPException(status_code=400, detail="Please select at least one interest.")

    requested_interests = db.query(Interest).filter(Interest.id.in_(update_in.interest_ids)).all()

    # Enforce child restrictions
    if current_user.account_type == "child" or current_user.is_kids_mode:
        for interest in requested_interests:
            if not interest.is_child_permitted:
                raise HTTPException(
                    status_code=403,
                    detail=f"The interest '{interest.name}' is not permitted for child accounts. Only Learning and Art are allowed."
                )

    # Clear and replace interests
    current_user.interests = requested_interests
    db.commit()
    db.refresh(current_user)

    return current_user.interests
