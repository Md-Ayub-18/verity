import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Interest, FocusMode, ActiveSession, PasswordResetToken
from app.schemas import (
    UserRegister, UserLogin, UserOut, Token, UserUpdate,
    ChangePasswordIn, ForgotPasswordIn, ResetPasswordIn, ActiveSessionOut,
    KidsModeToggleIn, KidsModeToggleOut
)
from app.security import (
    calculate_age, get_account_type, get_password_hash,
    verify_password, create_access_token, get_current_user,
    oauth2_scheme, hash_token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def format_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        birth_date=user.birth_date,
        age=user.age,
        account_type=user.account_type,
        is_moderator=user.is_moderator,
        is_admin=user.is_admin,
        is_kids_mode=user.is_kids_mode,
        kids_preview_mode=user.kids_preview_mode,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_verified=user.is_verified,
        is_private=user.is_private,
        default_audience=user.default_audience or "public",
        daily_screen_time_limit=user.daily_screen_time_limit,
        screen_time_used_today=user.screen_time_used_today,
        is_account_paused=user.is_account_paused,
        dms_enabled=user.dms_enabled,
        selected_interests=[i.id for i in user.interests]
    )

def _record_session(db: Session, user_id: int, token: str, request: Optional[Request] = None):
    ip = request.client.host if request and request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "Web Browser")[:250] if request else "Web Browser"
    session = ActiveSession(
        user_id=user_id,
        token_hash=hash_token(token),
        ip_address=ip,
        user_agent=ua,
        is_revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    db.add(session)
    db.commit()

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db), request: Request = None):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")

    age = calculate_age(user_in.birth_date)
    acc_type = get_account_type(age)

    is_kids = acc_type == "child"
    screen_limit = 30 if acc_type == "child" else 60

    guardian_id = None
    if acc_type == "child" and user_in.guardian_email:
        guardian = db.query(User).filter(User.email == user_in.guardian_email).first()
        if guardian:
            guardian_id = guardian.id

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        display_name=user_in.display_name,
        password_hash=get_password_hash(user_in.password),
        birth_date=user_in.birth_date,
        age=age,
        account_type=acc_type,
        is_kids_mode=is_kids,
        kids_preview_mode=False,
        daily_screen_time_limit=screen_limit,
        screen_time_used_today=0.0,
        guardian_id=guardian_id,
        dms_enabled=False if is_kids else True,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}" if is_kids else f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.username}"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if is_kids:
        child_interests = db.query(Interest).filter(Interest.is_child_permitted == True).all()
        new_user.interests.extend(child_interests)
    else:
        defaults = db.query(Interest).filter(Interest.slug.in_(["technology", "learning", "art"])).all()
        new_user.interests.extend(defaults)

    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "username": new_user.username})
    _record_session(db, new_user.id, token, request)

    return Token(
        access_token=token,
        token_type="bearer",
        user=format_user_out(new_user)
    )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db), request: Request = None):
    user = db.query(User).filter(
        (User.username == login_in.username_or_email) | (User.email == login_in.username_or_email)
    ).first()

    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password.")

    if user.is_account_paused:
        raise HTTPException(status_code=403, detail="Your account is paused by your guardian.")

    expires = timedelta(days=30) if login_in.remember_me else timedelta(hours=12)
    token = create_access_token(data={"sub": str(user.id), "username": user.username}, expires_delta=expires)
    _record_session(db, user.id, token, request)

    return Token(
        access_token=token,
        token_type="bearer",
        user=format_user_out(user)
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return format_user_out(current_user)

@router.put("/profile", response_model=UserOut)
def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.display_name is not None:
        current_user.display_name = user_update.display_name
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.is_private is not None:
        current_user.is_private = user_update.is_private
    if user_update.default_audience is not None:
        if user_update.default_audience not in ("public", "followers", "private"):
            raise HTTPException(status_code=400, detail="Invalid audience option.")
        current_user.default_audience = user_update.default_audience
    if user_update.daily_screen_time_limit is not None:
        if current_user.account_type == "child":
            raise HTTPException(status_code=403, detail="Child accounts cannot alter daily screen-time limits.")
        current_user.daily_screen_time_limit = user_update.daily_screen_time_limit
    if user_update.kids_preview_mode is not None:
        if current_user.account_type != "child" and not current_user.kids_lock_code:
            current_user.kids_preview_mode = user_update.kids_preview_mode

    db.commit()
    db.refresh(current_user)
    return format_user_out(current_user)

def _get_valid_time_codes(tz_offset_minutes: Optional[int] = None) -> set[str]:
    """Return valid HHMM / HMM current-time passcodes (12h & 24h, +/- 1 min tolerance)."""
    if tz_offset_minutes is not None:
        base_dt = datetime.now(timezone.utc) - timedelta(minutes=tz_offset_minutes)
    else:
        base_dt = datetime.now()

    codes = set()
    for delta in (-1, 0, 1):
        dt = base_dt + timedelta(minutes=delta)
        codes.add(dt.strftime("%I%M"))  # e.g. "1120" or "0545"
        codes.add(f"{int(dt.strftime('%I'))}{dt.strftime('%M')}")  # e.g. "545"
        codes.add(dt.strftime("%H%M"))  # e.g. "2320" or "1745"
    return codes

@router.post("/toggle-kids-mode", response_model=KidsModeToggleOut)
def toggle_kids_mode(
    payload: Optional[KidsModeToggleIn] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.account_type == "child":
        raise HTTPException(
            status_code=403,
            detail="Kids Mode is mandatory for child accounts and cannot be disabled."
        )

    if not current_user.kids_preview_mode:
        # Turning Kids Mode ON immediately -> unlocks later using present time password (e.g. 11:20 -> 1120)
        current_user.kids_lock_code = "TIME_LOCK"
        current_user.kids_preview_mode = True
        db.commit()
        db.refresh(current_user)
        return KidsModeToggleOut(user=format_user_out(current_user), generated_code=None)
    else:
        # Turning Kids Mode OFF -> verify present-time password (e.g. 11:20 PM -> 1120)
        entered_raw = payload.unlock_code.strip() if payload and payload.unlock_code else ""
        entered_clean = entered_raw.replace(":", "").replace(" ", "")
        tz_offset = payload.tz_offset_minutes if payload else None
        valid_codes = _get_valid_time_codes(tz_offset)

        if entered_clean not in valid_codes:
            raise HTTPException(
                status_code=403,
                detail="Incorrect password. (Hint: Time)"
            )

        current_user.kids_preview_mode = False
        current_user.kids_lock_code = None
        db.commit()
        db.refresh(current_user)
        return KidsModeToggleOut(user=format_user_out(current_user), generated_code=None)

@router.post("/change-password")
def change_password(
    pw_in: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pw_in.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.password_hash = get_password_hash(pw_in.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.post("/forgot-password")
def forgot_password(req_in: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req_in.email).first()
    if not user:
        return {"message": "If that email is registered, a reset token has been generated.", "demo_reset_token": None}

    token_str = secrets.token_urlsafe(24)
    reset_entry = PasswordResetToken(
        user_id=user.id,
        token=token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        used=False
    )
    db.add(reset_entry)
    db.commit()

    return {
        "message": "Reset token generated. (In production, this is sent via email.)",
        "demo_reset_token": token_str
    }

@router.post("/reset-password")
def reset_password(reset_in: ResetPasswordIn, db: Session = Depends(get_db)):
    entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_in.token,
        PasswordResetToken.used == False
    ).first()

    if not entry:
        raise HTTPException(status_code=400, detail="Invalid or already used reset token.")

    exp = entry.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired.")

    user = db.query(User).filter(User.id == entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.password_hash = get_password_hash(reset_in.new_password)
    entry.used = True
    # Revoke existing active sessions on password reset
    db.query(ActiveSession).filter(ActiveSession.user_id == user.id).update({"is_revoked": True})
    db.commit()
    return {"message": "Password has been reset. You can now sign in with your new password."}

@router.get("/sessions", response_model=List[ActiveSessionOut])
def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(ActiveSession).filter(
        ActiveSession.user_id == current_user.id,
        ActiveSession.is_revoked == False
    ).order_by(ActiveSession.created_at.desc()).all()

@router.post("/logout")
def logout_current_session(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    t_hash = hash_token(token)
    db.query(ActiveSession).filter(
        ActiveSession.user_id == current_user.id,
        ActiveSession.token_hash == t_hash
    ).update({"is_revoked": True})
    db.commit()
    return {"message": "Current session signed out."}

@router.post("/logout-all")
def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ActiveSession).filter(
        ActiveSession.user_id == current_user.id,
        ActiveSession.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()
    return {"message": "All active sessions have been signed out."}
