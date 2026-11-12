from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, 
    Float, Index, Table, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base

# Association table for User <-> Interest
class UserInterest(Base):
    __tablename__ = "user_interests"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    interest_id = Column(Integer, ForeignKey("interests.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Age & Classification
    birth_date = Column(String(20), nullable=False) # YYYY-MM-DD
    age = Column(Integer, nullable=False)
    account_type = Column(String(20), default="adult") # adult, teen, child
    
    # Roles
    is_moderator = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    # Kids mode states
    is_kids_mode = Column(Boolean, default=False)
    kids_preview_mode = Column(Boolean, default=False) # child safety lock mode for adult/teen
    kids_lock_code = Column(String(50), nullable=True) # random per-session unlock password
    is_guardian_verified = Column(Boolean, default=False)
    guardian_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Profile metadata
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_private = Column(Boolean, default=False)
    default_audience = Column(String(20), default="public") # public, followers, private
    
    # Screen-time management
    daily_screen_time_limit = Column(Integer, default=60) # in minutes (60 adult, 30 child)
    screen_time_used_today = Column(Float, default=0.0) # in minutes
    last_active_date = Column(String(20), nullable=True) # YYYY-MM-DD to reset daily
    
    # Guardian safety controls
    is_account_paused = Column(Boolean, default=False)
    dms_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    interests = relationship("Interest", secondary="user_interests", back_populates="users")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    reels = relationship("Reel", back_populates="author", cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="user", cascade="all, delete-orphan")
    focus_modes = relationship("FocusMode", back_populates="user", cascade="all, delete-orphan")
    reports_submitted = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter")
    
    guardian = relationship("User", remote_side=[id], foreign_keys=[guardian_id])
    wards = relationship("User", foreign_keys=[guardian_id], overlaps="guardian")

class Interest(Base):
    __tablename__ = "interests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False) # Learning, Sports, Art, Technology, Entertainment, Personal Stories, Social Causes
    slug = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    icon = Column(String(50), default="Sparkles")
    gradient = Column(String(100), default="from-pink-500 to-rose-500")
    is_child_permitted = Column(Boolean, default=False) # Only Learning & Art are child-permitted

    users = relationship("User", secondary="user_interests", back_populates="interests")
    posts = relationship("Post", back_populates="interest")
    reels = relationship("Reel", back_populates="interest")

class FocusMode(Base):
    __tablename__ = "focus_modes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Null for system defaults
    name = Column(String(100), nullable=False)
    emoji = Column(String(20), default="🎯")
    description = Column(String(255), nullable=True)
    is_system_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    # Stored as JSON string list of interest IDs e.g. [1, 4]
    selected_interests_json = Column(Text, default="[]")
    focus_duration_minutes = Column(Integer, default=45) # optional session timer
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="focus_modes")

    @property
    def selected_interest_ids(self):
        try:
            return json.loads(self.selected_interests_json or "[]")
        except Exception:
            return []

    @selected_interest_ids.setter
    def selected_interest_ids(self, val):
        self.selected_interests_json = json.dumps(val)

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content_type = Column(String(20), default="photo") # photo, video, text
    media_url = Column(String(500), nullable=True)
    caption = Column(Text, nullable=True)
    location = Column(String(150), nullable=True)
    
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=False, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=True, index=True)
    audience = Column(String(20), default="public") # public, followers, private
    
    # Trust & Safety
    is_ai_generated = Column(Boolean, default=False)
    ai_label_explanation = Column(String(255), nullable=True)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255), nullable=True)
    moderation_status = Column(String(30), default="approved") # approved, pending_review, rejected, under_review
    under_review_badge = Column(Boolean, default=False)
    
    # Counts
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="posts")
    interest = relationship("Interest", back_populates="posts")
    community = relationship("Community", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="post", cascade="all, delete-orphan")

class Reel(Base):
    __tablename__ = "reels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    caption = Column(Text, nullable=True)
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=False, index=True)
    audio_title = Column(String(150), default="Original Audio")
    
    is_ai_generated = Column(Boolean, default=False)
    ai_label_explanation = Column(String(255), nullable=True)
    moderation_status = Column(String(30), default="approved")
    is_child_approved = Column(Boolean, default=False)
    
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    saves_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=30)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    author = relationship("User", back_populates="reels")
    interest = relationship("Interest", back_populates="reels")
    comments = relationship("Comment", back_populates="reel", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="reel", cascade="all, delete-orphan")

class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    media_url = Column(String(500), nullable=False)
    media_type = Column(String(20), default="photo") # photo, video
    caption = Column(String(255), nullable=True)
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=True)
    is_live = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="stories")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    reel_id = Column(Integer, ForeignKey("reels.id", ondelete="CASCADE"), nullable=True)
    text = Column(Text, nullable=False)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    reel = relationship("Reel", back_populates="comments")

class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    reel_id = Column(Integer, ForeignKey("reels.id", ondelete="CASCADE"), nullable=True)
    reaction_type = Column(String(20), default="like") # like, save
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reactions")
    post = relationship("Post", back_populates="reactions")
    reel = relationship("Reel", back_populates="reactions")

class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    followed_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    reel_id = Column(Integer, ForeignKey("reels.id", ondelete="SET NULL"), nullable=True)
    reported_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String(50), nullable=False) # hate_speech, harassment, misinformation, nsfw, spam, child_safety, other
    description = Column(Text, nullable=True)
    status = Column(String(30), default="pending") # pending, resolved, dismissed
    moderator_notes = Column(Text, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reports_submitted")
    reported_user = relationship("User", foreign_keys=[reported_user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class HidePost(Base):
    __tablename__ = "hide_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    rules = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=False)
    member_count = Column(Integer, default=1)
    is_child_safe = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    interest = relationship("Interest")
    posts = relationship("Post", back_populates="community")
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")

class CommunityMember(Base):
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="member") # member, moderator, admin
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    community = relationship("Community", back_populates="members")
    user = relationship("User")

class StitchProject(Base):
    __tablename__ = "stitch_projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="collecting") # collecting, stitching, completed, published
    final_video_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User")
    contributions = relationship("StitchContribution", back_populates="project", cascade="all, delete-orphan")

class StitchContribution(Base):
    __tablename__ = "stitch_contributions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("stitch_projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    consent_given = Column(Boolean, default=True) # contributor recorded consent
    status = Column(String(30), default="pending") # pending, approved, rejected
    moderator_feedback = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("StitchProject", back_populates="contributions")
    user = relationship("User")

class GuardianLink(Base):
    __tablename__ = "guardian_links"

    id = Column(Integer, primary_key=True, index=True)
    guardian_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    child_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    guardian = relationship("User", foreign_keys=[guardian_id])
    child = relationship("User", foreign_keys=[child_id])

class ScreenSession(Base):
    __tablename__ = "screen_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_start = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    session_end = Column(DateTime, nullable=True)
    total_seconds = Column(Integer, default=0)
    device_info = Column(String(255), default="Desktop Web")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

class ModerationLog(Base):
    __tablename__ = "moderation_logs"

    id = Column(Integer, primary_key=True, index=True)
    moderator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entity_type = Column(String(50), nullable=False) # post, reel, comment, user, stitch_clip
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False) # approved, flagged, removed, warned, banned
    previous_state = Column(String(50), nullable=True)
    new_state = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    moderator = relationship("User")

class BotSignal(Base):
    __tablename__ = "bot_signals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anomaly_score = Column(Float, default=0.0) # 0.0 to 1.0
    rapid_action_count = Column(Integer, default=0)
    flags_detected_json = Column(Text, default="[]") # JSON list of flags
    status = Column(String(30), default="suspicious") # suspicious, reviewed_clean, restricted
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

    @property
    def flags_detected(self):
        try:
            return json.loads(self.flags_detected_json or "[]")
        except Exception:
            return []

class BullyingSignal(Base):
    __tablename__ = "bullying_signals"

    id = Column(Integer, primary_key=True, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repeated_flagged_interactions = Column(Integer, default=1)
    signal_severity = Column(String(20), default="low") # low, medium, high
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    target_user = relationship("User", foreign_keys=[target_user_id])
    actor_user = relationship("User", foreign_keys=[actor_user_id])

class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(100), default="127.0.0.1")
    user_agent = Column(String(255), default="Browser")
    is_revoked = Column(Boolean, default=False)
    last_active_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(30), nullable=False) # like, comment, follow, moderation, guardian, stitch
    message = Column(String(255), nullable=False)
    entity_type = Column(String(30), nullable=True) # post, reel, user, stitch_project
    entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

class ModerationAppeal(Base):
    __tablename__ = "moderation_appeals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(30), nullable=False) # post, reel, comment
    entity_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="pending") # pending, approved, rejected
    moderator_notes = Column(Text, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(60), nullable=False)
    cover_url = Column(String(500), nullable=False)
    media_url = Column(String(500), nullable=False)
    media_type = Column(String(20), default="photo") # photo, video
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id])
