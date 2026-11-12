from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Auth & User ---
class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6)
    birth_date: str = Field(..., description="YYYY-MM-DD")
    guardian_email: Optional[str] = None # required if child

class UserLogin(BaseModel):
    username_or_email: str
    password: str
    remember_me: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    display_name: str
    birth_date: str
    age: int
    account_type: str
    is_moderator: bool
    is_admin: bool
    is_kids_mode: bool
    kids_preview_mode: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool
    is_private: bool
    default_audience: str = "public"
    daily_screen_time_limit: int
    screen_time_used_today: float
    is_account_paused: bool
    dms_enabled: bool
    selected_interests: List[int] = []

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None
    default_audience: Optional[str] = None
    daily_screen_time_limit: Optional[int] = None
    kids_preview_mode: Optional[bool] = None

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordIn(BaseModel):
    email: str

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class ActiveSessionOut(BaseModel):
    id: int
    ip_address: str
    user_agent: str
    is_revoked: bool
    last_active_at: datetime
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BlockedUserOut(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None

class KidsModeToggleIn(BaseModel):
    unlock_code: Optional[str] = None
    custom_code: Optional[str] = None
    tz_offset_minutes: Optional[int] = None

class KidsModeToggleOut(BaseModel):
    user: UserOut
    generated_code: Optional[str] = None

# --- Interests ---
class InterestOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    icon: str
    gradient: str
    is_child_permitted: bool

    model_config = ConfigDict(from_attributes=True)

class UserInterestsUpdate(BaseModel):
    interest_ids: List[int]

# --- Focus Modes ---
class FocusModeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    emoji: str = "🎯"
    description: Optional[str] = None
    selected_interest_ids: List[int]
    focus_duration_minutes: Optional[int] = 45

class FocusModeUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    description: Optional[str] = None
    selected_interest_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None

class FocusModeOut(BaseModel):
    id: int
    name: str
    emoji: str
    description: Optional[str] = None
    is_system_default: bool
    is_active: bool
    selected_interest_ids: List[int]
    focus_duration_minutes: int

    model_config = ConfigDict(from_attributes=True)

# --- Comments ---
class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    post_id: Optional[int] = None
    reel_id: Optional[int] = None

class CommentOut(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str
    avatar_url: Optional[str]
    text: str
    is_flagged: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Posts ---
class PostCreate(BaseModel):
    content_type: str = "photo" # photo, video, text
    media_url: Optional[str] = None
    caption: Optional[str] = None
    location: Optional[str] = None
    interest_id: int
    community_id: Optional[int] = None
    audience: str = "public"
    is_ai_generated: bool = False
    ai_label_explanation: Optional[str] = None

class PostOut(BaseModel):
    id: int
    user_id: int
    author_username: str
    author_display_name: str
    author_avatar: Optional[str]
    author_is_verified: bool
    content_type: str
    media_url: Optional[str]
    caption: Optional[str]
    location: Optional[str]
    interest_id: int
    interest_name: str
    interest_gradient: str
    community_id: Optional[int]
    community_name: Optional[str] = None
    audience: str
    is_ai_generated: bool
    ai_label_explanation: Optional[str]
    is_flagged: bool
    flag_reason: Optional[str] = None
    moderation_status: str
    under_review_badge: bool
    likes_count: int
    comments_count: int
    has_liked: bool = False
    has_saved: bool = False
    created_at: datetime
    # Transparency explaining why content is displayed
    recommendation_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Reels ---
class ReelCreate(BaseModel):
    video_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    interest_id: int
    audio_title: Optional[str] = "Original Audio"
    is_ai_generated: bool = False
    ai_label_explanation: Optional[str] = None

class ReelOut(BaseModel):
    id: int
    user_id: int
    author_username: str
    author_display_name: str
    author_avatar: Optional[str]
    author_is_verified: bool
    is_following_author: bool = False
    video_url: str
    thumbnail_url: Optional[str]
    caption: Optional[str]
    interest_id: int
    interest_name: str
    interest_gradient: str
    audio_title: str
    is_ai_generated: bool
    ai_label_explanation: Optional[str]
    moderation_status: str
    is_child_approved: bool
    likes_count: int
    comments_count: int
    shares_count: int
    saves_count: int
    views_count: int = 0
    has_liked: bool = False
    has_saved: bool = False
    duration_seconds: int
    created_at: datetime
    recommendation_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Stories ---
class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "photo"
    caption: Optional[str] = None
    interest_id: Optional[int] = None
    is_live: bool = False

class StoryOut(BaseModel):
    id: int
    user_id: int
    author_username: str
    author_display_name: str
    author_avatar: Optional[str]
    media_url: str
    media_type: str
    caption: Optional[str]
    is_live: bool
    created_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Communities ---
class CommunityCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    slug: str
    description: Optional[str] = None
    rules: Optional[str] = None
    interest_id: int
    icon_url: Optional[str] = None

class CommunityOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    rules: Optional[str]
    icon_url: Optional[str]
    interest_id: int
    interest_name: str
    member_count: int
    is_child_safe: bool
    is_member: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Stitch Studio ---
class StitchProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None

class StitchContributionCreate(BaseModel):
    project_id: int
    video_url: str
    caption: Optional[str] = None
    consent_given: bool = True

class StitchContributionOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    username: str
    avatar_url: Optional[str]
    video_url: str
    caption: Optional[str]
    consent_given: bool
    status: str
    moderator_feedback: Optional[str]
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StitchProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    creator_id: int
    creator_username: str
    status: str
    final_video_url: Optional[str]
    contributions: List[StitchContributionOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Guardian Controls ---
class GuardianChildSummaryOut(BaseModel):
    child_id: int
    child_username: str
    child_display_name: str
    child_avatar: Optional[str]
    account_type: str
    daily_screen_time_limit: int
    screen_time_used_today: float
    is_account_paused: bool
    dms_enabled: bool
    recent_activity_count: int
    flagged_content_count: int
    allowed_interests: List[str]

class GuardianUpdateLimits(BaseModel):
    daily_screen_time_limit: Optional[int] = None
    is_account_paused: Optional[bool] = None
    dms_enabled: Optional[bool] = None

# --- Reports & Moderation ---
class ReportCreate(BaseModel):
    post_id: Optional[int] = None
    reel_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str # hate_speech, harassment, misinformation, nsfw, spam, child_safety, other
    description: Optional[str] = None

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reporter_username: str
    post_id: Optional[int]
    reel_id: Optional[int]
    reported_user_id: Optional[int]
    reported_username: Optional[str] = None
    reason: str
    description: Optional[str]
    status: str
    moderator_notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModerationActionIn(BaseModel):
    action: str # approve, reject, flag, warn, ban
    reason: str
    notes: Optional[str] = None

class ModerationLogOut(BaseModel):
    id: int
    moderator_name: Optional[str]
    entity_type: str
    entity_id: int
    action: str
    previous_state: Optional[str]
    new_state: Optional[str]
    reason: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BotSignalOut(BaseModel):
    id: int
    user_id: int
    username: str
    anomaly_score: float
    rapid_action_count: int
    flags_detected: List[str]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BullyingSignalOut(BaseModel):
    id: int
    target_user_id: int
    target_username: str
    actor_user_id: int
    actor_username: str
    repeated_flagged_interactions: int
    signal_severity: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Screen Time ---
class ScreenTimeHeartbeatIn(BaseModel):
    active_seconds: int = 60
    fast_forward_minutes: Optional[float] = 0.0 # for interactive testing/demo

class ScreenTimeStatusOut(BaseModel):
    screen_time_used_today: float # in minutes
    daily_screen_time_limit: int # in minutes
    remaining_minutes: float
    is_limit_reached: bool
    grace_period_active: bool = False
    grace_period_remaining_seconds: int = 0
    account_type: str
    should_lock_screen: bool = False
    reminder_message: Optional[str] = None

# --- Notifications ---
class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    actor_username: Optional[str] = None
    actor_avatar: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Moderation Appeals ---
class ModerationAppealCreate(BaseModel):
    entity_type: str = "post"
    entity_id: int
    reason: str = Field(..., min_length=5, max_length=500)

class ModerationAppealOut(BaseModel):
    id: int
    user_id: int
    username: str
    entity_type: str
    entity_id: int
    reason: str
    status: str
    moderator_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Highlights ---
class HighlightCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=60)
    cover_url: str
    media_url: Optional[str] = None
    media_type: str = "photo"

class HighlightOut(BaseModel):
    id: int
    user_id: int
    title: str
    cover_url: str
    media_url: str
    media_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Stitch Publish ---
class StitchPublishIn(BaseModel):
    caption: Optional[str] = None
    interest_id: Optional[int] = None
    audience: str = "public"
