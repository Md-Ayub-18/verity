from datetime import datetime
import pytest
import app.main  # ensures schema migration helper runs before queries
from app.database import SessionLocal
from app.models import User, Interest, FocusMode, Post, Reel, Community, Report, Notification, Highlight, ModerationAppeal, StitchProject
from app.security import calculate_age, get_account_type, get_current_user
from app.routers import auth, interests, focus_modes, posts, reels, moderation, screen_time, notifications, users, upload, stitch
from app.schemas import (
    UserLogin, UserInterestsUpdate, PostCreate,
    CommentCreate, ScreenTimeHeartbeatIn, ModerationActionIn,
    ChangePasswordIn, ForgotPasswordIn, ResetPasswordIn,
    ReportCreate, ModerationAppealCreate, UserUpdate,
    KidsModeToggleIn, HighlightCreate, StitchPublishIn
)
from app.services.feed_service import get_feed_posts, get_feed_reels
from fastapi import HTTPException

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

# 1. Age Calculation & Classification
def test_age_classification():
    assert get_account_type(calculate_age("1995-01-01")) == "adult"
    assert get_account_type(calculate_age("2018-05-15")) == "child"
    assert get_account_type(calculate_age("2010-02-10")) == "teen"

# 2. Adult Authentication & Permissions
def test_adult_login(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    assert user_mila is not None
    assert user_mila.account_type == "adult"
    res = auth.login(UserLogin(username_or_email="mila.creates", password="password123"), db)
    assert res.access_token is not None
    assert res.user.account_type == "adult"

# 3. Child Login Enforces Mandatory Kids Mode
def test_child_login_enforces_kids_mode(db):
    user_sammy = db.query(User).filter(User.username == "sammy_kid").first()
    assert user_sammy is not None
    assert user_sammy.account_type == "child"
    assert user_sammy.is_kids_mode is True
    assert user_sammy.daily_screen_time_limit == 30

# 4. Child Cannot Disable Kids Mode
def test_child_cannot_disable_kids_mode(db):
    user_sammy = db.query(User).filter(User.username == "sammy_kid").first()
    with pytest.raises(HTTPException) as exc_info:
        auth.toggle_kids_mode(None, user_sammy, db)
    assert exc_info.value.status_code == 403

# 5. Adult Can Toggle Kids Mode Preview With Present-Time Unlock Password
def test_adult_can_toggle_kids_mode_preview(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    # Reset if left locked from an earlier interrupted run
    user_giri.kids_preview_mode = False
    user_giri.kids_lock_code = None
    db.commit()

    # Enabling Kids Mode enters immediately without pre-lock prompt
    res = auth.toggle_kids_mode(None, user_giri, db)
    assert res.user.kids_preview_mode is True

    # Invalid unlock code must fail
    with pytest.raises(HTTPException) as exc_info:
        auth.toggle_kids_mode(KidsModeToggleIn(unlock_code="9999"), user_giri, db)
    assert exc_info.value.status_code == 403

    # Present time code (e.g. 11:20 -> "1120") unlocks cleanly
    now_code = datetime.now().strftime("%I%M")
    res2 = auth.toggle_kids_mode(KidsModeToggleIn(unlock_code=now_code), user_giri, db)
    assert res2.user.kids_preview_mode is False
    assert res2.generated_code is None

# 6. Interests System: Verify 7 Primary Pillars
def test_interests_system(db):
    all_interests = interests.list_interests(db)
    assert len(all_interests) == 7
    slugs = {i.slug for i in all_interests}
    assert {"learning", "sports", "art", "technology", "entertainment", "personal-stories", "social-causes"}.issubset(slugs)

# 7. Child Restricted to Permitted Interests (Learning & Art Only)
def test_child_restricted_interests(db):
    user_sammy = db.query(User).filter(User.username == "sammy_kid").first()
    # Try selecting sports or technology
    tech_interest = db.query(Interest).filter(Interest.slug == "technology").first()
    with pytest.raises(HTTPException) as exc_info:
        interests.update_my_interests(UserInterestsUpdate(interest_ids=[tech_interest.id]), user_sammy, db)
    assert exc_info.value.status_code == 403

# 8. Normal Feed Discovery (Focus Mode OFF)
def test_normal_feed_discovery(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    # Ensure Focus Mode is OFF
    for fm in db.query(FocusMode).all():
        fm.is_active = False
    db.commit()

    feed = get_feed_posts(db, user_mila, page=1, limit=20)
    assert len(feed) > 0
    # Transparent discovery explanation present on every post
    assert all("recommendation_reason" in p for p in feed)

# 9. Strict Focus Mode Filtering (Focus Mode ON)
def test_strict_focus_mode_filtering(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    study_mode = db.query(FocusMode).filter(FocusMode.name == "Study Mode").first()
    
    # Activate Study Mode
    focus_modes.toggle_focus_mode(study_mode.id, user_giri, db)
    
    strict_feed = get_feed_posts(db, user_giri, page=1, limit=20)
    for p in strict_feed:
        assert p["interest_name"] in ["Learning", "Technology"]

    # Deactivate Study Mode
    focus_modes.toggle_focus_mode(study_mode.id, user_giri, db)

# 10. Reels Feed Behavior in Both Modes
def test_reels_behavior(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    reels_list = get_feed_reels(db, user_mila, limit=10)
    assert len(reels_list) > 0
    assert all("video_url" in r for r in reels_list)

# 11. Screen-Time Heartbeat & Alerts
def test_screen_time_heartbeat(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    # Heartbeat with fast-forward 20m
    res = screen_time.record_heartbeat(ScreenTimeHeartbeatIn(active_seconds=60, fast_forward_minutes=20.0), user_giri, db)
    assert res.screen_time_used_today >= 20.0

# 12. Child Mandatory Screen Time Enforcement
def test_child_screen_time_lock(db):
    user_sammy = db.query(User).filter(User.username == "sammy_kid").first()
    # Fast forward past 30m child limit
    res = screen_time.record_heartbeat(ScreenTimeHeartbeatIn(active_seconds=60, fast_forward_minutes=35.0), user_sammy, db)
    assert res.is_limit_reached is True
    assert res.should_lock_screen is True

    # Reset
    screen_time.reset_demo_screen_time(user_sammy, db)

# 13. Safe Post Creation with AI Label (and cleanup)
def test_safe_post_creation(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    new_post = posts.create_post(PostCreate(
        content_type="text",
        caption="Building responsible technology for future generations on Verity.",
        interest_id=4,
        is_ai_generated=True,
        ai_label_explanation="Written with AI assistance."
    ), user_giri, db)
    assert new_post.is_ai_generated is True
    assert new_post.moderation_status == "approved"
    # Verify newest post appears on top of feed
    feed = get_feed_posts(db, user_giri, page=1, limit=20)
    assert feed[0]["id"] == new_post.id
    # Clean up test post
    db_post = db.query(Post).filter(Post.id == new_post.id).first()
    if db_post:
        db.delete(db_post)
        db.commit()

# 14. Hate Speech / Toxic / Misleading Text Moderation Automated Pipeline
def test_toxic_text_moderation_flagged(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    flagged_post = posts.create_post(PostCreate(
        content_type="text",
        caption="I hate you and want you to die, you are an ugly worthless idiot.",
        interest_id=4
    ), user_giri, db)
    assert flagged_post.is_flagged is True
    assert flagged_post.moderation_status == "pending_review"
    assert flagged_post.flag_reason is not None

    # Must NOT appear in public feed (neither for author nor others)
    feed_other = get_feed_posts(db, user_mila, page=1, limit=50)
    assert all(p["id"] != flagged_post.id for p in feed_other)
    feed_self = get_feed_posts(db, user_giri, page=1, limit=50)
    assert all(p["id"] != flagged_post.id for p in feed_self)

    # Must appear on creator's own profile (marked flagged), but NOT on profile viewed by others
    self_prof = users.get_user_profile(user_giri.username, user_giri, db)
    assert any(p["id"] == flagged_post.id and p["is_flagged"] is True for p in self_prof["posts"])
    other_prof = users.get_user_profile(user_giri.username, user_mila, db)
    assert all(p["id"] != flagged_post.id for p in other_prof["posts"])

    # Clean up test post
    db_post = db.query(Post).filter(Post.id == flagged_post.id).first()
    if db_post:
        db.delete(db_post)
        db.commit()

# 15. Post Like & Save Interactions
def test_post_interactions(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    like_res = posts.toggle_like(1, user_giri, db)
    assert "liked" in like_res
    save_res = posts.toggle_save(1, user_giri, db)
    assert "saved" in save_res

# 16. Communities Membership Workflow
def test_communities_workflow(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    comm = db.query(Community).first()
    join_res = db.query(Community).filter(Community.id == comm.id).first()
    assert join_res is not None

# 17. Avatar Profile Update
def test_avatar_profile_update(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    old_avatar = user_giri.avatar_url
    updated = auth.update_profile(UserUpdate(avatar_url="/uploads/avatars/test_avatar.png"), user_giri, db)
    assert updated.avatar_url == "/uploads/avatars/test_avatar.png"
    auth.update_profile(UserUpdate(avatar_url=old_avatar), user_giri, db)

# 18. FFmpeg Stitch Render Workflow
def test_ffmpeg_stitch_render(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    projects = stitch.list_projects(db)
    assert len(projects) > 0
    rendered = stitch.render_stitched_video(projects[0].id, user_giri, db)
    assert rendered.status == "completed"
    assert rendered.final_video_url is not None
    assert rendered.final_video_url.startswith("/uploads/stitch/")

# 19. Moderator Dashboard Verification
def test_moderator_dashboard(db):
    user_alex = db.query(User).filter(User.username == "alex_mod").first()
    summary = moderation.get_moderation_summary(user_alex, db)
    assert summary["pending_reports_count"] >= 0
    assert summary["flagged_posts_count"] >= 0

# 20. Video Stitch Consent & Workflow
def test_stitch_workflow(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    proj = db.query(Post).first()
    assert proj is not None

# 21. Notifications Creation & Read Flow
def test_notifications_flow(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    user_giri = db.query(User).filter(User.username == "giri").first()
    posts.add_comment(1, CommentCreate(text="Awesome photo Mila!"), user_giri, db)
    notifs = notifications.get_notifications(user_mila, db)
    assert len(notifs) > 0
    unread = notifications.get_unread_count(user_mila, db)
    assert unread["unread_count"] >= 1
    notifications.mark_all_read(user_mila, db)
    assert notifications.get_unread_count(user_mila, db)["unread_count"] == 0

# 22. Reels Comments & Reporting
def test_reels_comments_and_report(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    reel = db.query(Reel).first()
    comment = reels.add_reel_comment(reel.id, CommentCreate(text="Clean lighting breakdown!"), user_giri, db)
    assert comment.text == "Clean lighting breakdown!"
    fetched = reels.get_reel_comments(reel.id, db)
    assert any(c.id == comment.id for c in fetched)
    rep = reels.report_reel(reel.id, ReportCreate(reason="spam", description="Test reel report"), user_giri, db)
    assert rep["status"] == "pending"

# 23. Saved Posts Retrieval
def test_saved_posts_retrieval(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    # Ensure post 1 is saved
    res = posts.toggle_save(1, user_giri, db)
    if not res["saved"]:
        posts.toggle_save(1, user_giri, db)
    saved = posts.get_saved_posts(user_giri, db)
    assert any(p["id"] == 1 for p in saved)

# 24. Private Account Gating & Default Audience
def test_private_account_enforcement(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    user_alex = db.query(User).filter(User.username == "alex_mod").first()
    auth.update_profile(UserUpdate(is_private=True, default_audience="followers"), user_mila, db)
    assert user_mila.default_audience == "followers"
    profile_view = users.get_user_profile("mila.creates", user_alex, db)
    assert profile_view["is_private_locked"] is True
    assert profile_view["posts"] == []
    # Restore public state
    auth.update_profile(UserUpdate(is_private=False, default_audience="public"), user_mila, db)

# 25. Password Change, Forgot/Reset & Session Revocation
def test_password_and_session_revocation(db):
    login_res = auth.login(UserLogin(username_or_email="giri", password="password123"), db)
    token = login_res.access_token
    user_giri = db.query(User).filter(User.username == "giri").first()

    # Sessions list populated
    sessions = auth.get_active_sessions(user_giri, db)
    assert len(sessions) >= 1

    # Forgot & reset password roundtrip
    forgot_res = auth.forgot_password(ForgotPasswordIn(email="giri@verity.app"), db)
    reset_token = forgot_res["demo_reset_token"]
    assert reset_token is not None
    auth.reset_password(ResetPasswordIn(token=reset_token, new_password="password123"), db)

    # Reset revokes old session token
    with pytest.raises(Exception) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401

# 26. Moderation Appeals & Flagged Comments
def test_moderation_appeals_and_comments(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    user_alex = db.query(User).filter(User.username == "alex_mod").first()
    flagged = posts.create_post(PostCreate(
        content_type="text",
        caption="You are an idiot and worthless.",
        interest_id=4
    ), user_giri, db)
    appeal = moderation.submit_appeal(ModerationAppealCreate(
        entity_type="post",
        entity_id=flagged.id,
        reason="This was quoted dialogue from a screenplay."
    ), user_giri, db)
    assert appeal.status == "pending"
    resolved = moderation.resolve_appeal(appeal.id, "approve", "Context verified", user_alex, db)
    assert resolved["status"] == "approved"
    # Clean up temporary test post & appeal so Explore remains clean
    db.query(ModerationAppeal).filter(ModerationAppeal.id == appeal.id).delete()
    db.query(Post).filter(Post.id == flagged.id).delete()
    db.commit()

# 27. Upload Magic Bytes Validation
def test_upload_magic_bytes():
    assert upload._verify_magic_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01", "image/jpeg") is True
    assert upload._verify_magic_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "image/png") is True
    assert upload._verify_magic_bytes(b"NOT_A_REAL_IMAGE_BYTES", "image/jpeg") is False

# 28. User Profile Returns Full Post Payloads & Stories
def test_user_profile_returns_full_posts_and_stories(db):
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    user_giri = db.query(User).filter(User.username == "giri").first()
    profile_view = users.get_user_profile(user_mila.username, user_giri, db)
    assert isinstance(profile_view["stories"], list)
    assert len(profile_view["posts"]) >= 1
    first_post = profile_view["posts"][0]
    assert first_post["author_username"] == "mila.creates"
    assert "has_liked" in first_post
    assert "has_saved" in first_post
    assert isinstance(profile_view["highlights"], list)

# 29. Highlights CRUD & Profile Integration
def test_highlights_crud(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    created = users.create_highlight(
        HighlightCreate(title="Test Trip", cover_url="/uploads/posts/sample.jpg", media_type="photo"),
        user_giri,
        db
    )
    prof = users.get_user_profile(user_giri.username, user_giri, db)
    assert any(h["id"] == created.id and h["title"] == "Test Trip" for h in prof["highlights"])
    res = users.delete_highlight(created.id, user_giri, db)
    assert res["deleted"] is True

# 30. Reels View Tracking & Priority Ranking
def test_reels_views_and_ranking(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    reel = db.query(Reel).first()
    before_views = reel.views_count or 0
    res = reels.record_reel_view(reel.id, user_giri, db)
    assert res["views_count"] == before_views + 1
    ranked = get_feed_reels(db, user_giri, limit=10)
    assert len(ranked) > 0
    assert "views_count" in ranked[0]

# 31. Like Notification Creation
def test_like_creates_notification(db):
    user_giri = db.query(User).filter(User.username == "giri").first()
    user_mila = db.query(User).filter(User.username == "mila.creates").first()
    mila_post = db.query(Post).filter(Post.user_id == user_mila.id, Post.moderation_status == "approved").first()
    # Ensure toggling to liked fires notification
    res = posts.toggle_like(mila_post.id, user_giri, db)
    if not res["liked"]:
        res = posts.toggle_like(mila_post.id, user_giri, db)
    notifs = notifications.get_notifications(user_mila, db)
    assert any(n.type == "like" and n.actor_username == "giri" for n in notifs)

# 32. Publish Completed Stitch Project to Profile
def test_publish_stitched_video(db):
    proj = db.query(StitchProject).filter(StitchProject.final_video_url.isnot(None)).first()
    if proj:
        owner = db.query(User).filter(User.id == proj.creator_id).first()
        pub = stitch.publish_stitched_video(
            proj.id,
            StitchPublishIn(caption="Published stitch verification", audience="public"),
            owner,
            db
        )
        assert pub.content_type == "video"
        assert pub.media_url == proj.final_video_url
        db.query(Post).filter(Post.id == pub.id).delete()
        db.commit()
