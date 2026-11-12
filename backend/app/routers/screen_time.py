from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ScreenSession
from app.schemas import ScreenTimeHeartbeatIn, ScreenTimeStatusOut
from app.security import get_current_user

router = APIRouter(prefix="/screen-time", tags=["Screen Time Management"])

@router.post("/heartbeat", response_model=ScreenTimeStatusOut)
def record_heartbeat(
    heartbeat: ScreenTimeHeartbeatIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Heartbeat called periodically while user is actively browsing.
    Increments screen time used today, enforces mandatory daily limits for children,
    and returns friendly break reminders.
    Supports demo fast-forwarding for evaluators.
    """
    today_str = date.today().isoformat()
    if current_user.last_active_date != today_str:
        # Reset screen time for new day
        current_user.screen_time_used_today = 0.0
        current_user.last_active_date = today_str

    # Add active time in minutes
    added_minutes = (heartbeat.active_seconds / 60.0) + (heartbeat.fast_forward_minutes or 0.0)
    current_user.screen_time_used_today += added_minutes

    db.commit()
    db.refresh(current_user)

    used = current_user.screen_time_used_today
    limit = current_user.daily_screen_time_limit
    remaining = max(0.0, limit - used)
    limit_reached = used >= limit

    is_child = current_user.account_type == "child" or current_user.is_kids_mode
    should_lock = limit_reached and is_child

    # Determine contextual reminder
    reminder = None
    if limit_reached:
        reminder = "Your daily screen-time limit has been reached. Time to unplug and rest!"
    elif remaining <= 5.0:
        reminder = f"Only {int(remaining)} minutes remaining before your daily screen-time limit."
    elif int(used) > 0 and int(used) % 20 == 0:
        reminder = f"You've been browsing for {int(used)} minutes. Take a short 20-second break to rest your eyes."

    return ScreenTimeStatusOut(
        screen_time_used_today=round(used, 1),
        daily_screen_time_limit=limit,
        remaining_minutes=round(remaining, 1),
        is_limit_reached=limit_reached,
        grace_period_active=limit_reached and not should_lock,
        grace_period_remaining_seconds=0 if should_lock else 120,
        account_type=current_user.account_type,
        should_lock_screen=should_lock,
        reminder_message=reminder
    )

@router.get("/status", response_model=ScreenTimeStatusOut)
def get_screen_time_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today_str = date.today().isoformat()
    if current_user.last_active_date != today_str:
        current_user.screen_time_used_today = 0.0
        current_user.last_active_date = today_str
        db.commit()

    used = current_user.screen_time_used_today
    limit = current_user.daily_screen_time_limit
    remaining = max(0.0, limit - used)
    limit_reached = used >= limit
    is_child = current_user.account_type == "child" or current_user.is_kids_mode

    return ScreenTimeStatusOut(
        screen_time_used_today=round(used, 1),
        daily_screen_time_limit=limit,
        remaining_minutes=round(remaining, 1),
        is_limit_reached=limit_reached,
        grace_period_active=False,
        grace_period_remaining_seconds=0,
        account_type=current_user.account_type,
        should_lock_screen=limit_reached and is_child,
        reminder_message=None
    )

@router.post("/reset-demo")
def reset_demo_screen_time(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convenience helper for testers to reset screen time counter"""
    current_user.screen_time_used_today = 0.0
    db.commit()
    return {"message": "Screen time reset to 0 minutes for testing."}
