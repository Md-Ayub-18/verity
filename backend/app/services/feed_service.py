from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, not_

from app.models import User, Post, Reel, Interest, FocusMode, Block, HidePost, CommunityMember, Follow

def _get_visibility_context(db: Session, current_user: User):
    blocked_ids = [
        b.blocked_id for b in db.query(Block).filter(Block.blocker_id == current_user.id).all()
    ] + [
        b.blocker_id for b in db.query(Block).filter(Block.blocked_id == current_user.id).all()
    ]
    hidden_post_ids = [
        h.post_id for h in db.query(HidePost).filter(HidePost.user_id == current_user.id).all()
    ]
    following_ids = [
        f.followed_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    ]
    private_user_ids = [
        u.id for u in db.query(User.id).filter(User.is_private == True).all()
    ]
    return blocked_ids, hidden_post_ids, following_ids, private_user_ids

def get_feed_posts(
    db: Session,
    current_user: User,
    page: int = 1,
    limit: int = 20
) -> List[dict]:
    """
    Feed algorithm respecting user interests, active Focus Mode,
    discovery rules, Kids Mode restrictions, privacy/audience, and block/hide lists.
    """
    blocked_ids, hidden_post_ids, following_ids, private_user_ids = _get_visibility_context(db, current_user)
    non_followed_private = [uid for uid in private_user_ids if uid != current_user.id and uid not in following_ids]

    # Base query with strict safety + privacy & audience enforcement
    # Flagged / hate speech / misleading / harmful posts are removed from the public feed & Explore
    query = db.query(Post).filter(
        Post.moderation_status == "approved",
        Post.is_flagged == False,
        Post.user_id.notin_(blocked_ids) if blocked_ids else True,
        Post.id.notin_(hidden_post_ids) if hidden_post_ids else True,
        Post.user_id.notin_(non_followed_private) if non_followed_private else True,
        or_(
            Post.user_id == current_user.id,
            Post.audience == "public",
            and_(Post.audience == "followers", Post.user_id.in_(following_ids) if following_ids else False)
        )
    )

    # 2. Check Kids Mode / Child Account status
    is_child = current_user.account_type == "child" or current_user.is_kids_mode or current_user.kids_preview_mode
    if is_child:
        # Strictly child permitted interests (Learning, Art) and only approved content
        permitted_interests = db.query(Interest.id).filter(Interest.is_child_permitted == True).all()
        child_interest_ids = [i[0] for i in permitted_interests]
        query = query.filter(
            Post.interest_id.in_(child_interest_ids)
        )
        posts = query.order_by(desc(Post.created_at), desc(Post.id)).limit(limit).all()
        return format_posts(posts, current_user, "Child-Safe Discovery: Age-Appropriate Learning & Art")

    # 3. Check Active Focus Mode
    active_focus = db.query(FocusMode).filter(
        or_(FocusMode.user_id == current_user.id, FocusMode.is_system_default == True),
        FocusMode.is_active == True
    ).first()

    if active_focus and active_focus.selected_interest_ids:
        # Focus Mode ON -> STRICT FILTERING
        focus_interest_ids = active_focus.selected_interest_ids
        query = query.filter(Post.interest_id.in_(focus_interest_ids))
        posts = query.order_by(desc(Post.created_at), desc(Post.id)).offset((page - 1) * limit).limit(limit).all()
        return format_posts(posts, current_user, f"Focus Mode Active: {active_focus.name} (Strict Filter)")

    # 4. Focus Mode OFF -> Every new post appears on top, with balanced discovery reasons
    user_interest_ids = [i.id for i in current_user.interests]
    user_interest_set = set(user_interest_ids)

    if not user_interest_ids:
        posts = query.order_by(desc(Post.created_at), desc(Post.id)).offset((page - 1) * limit).limit(limit).all()
        return format_posts(posts, current_user, "Fresh on Verity")

    # Fetch chronological pool (newest posts first) so any new post immediately shows on top,
    # while blending selected interests (~70%) and discovery (~30%) in the feed.
    selected_target = max(1, int(limit * 0.7))
    discovery_target = max(1, limit - selected_target)

    selected_posts = query.filter(
        Post.interest_id.in_(user_interest_ids)
    ).order_by(desc(Post.created_at), desc(Post.id)).offset((page - 1) * selected_target).limit(selected_target).all()

    discovery_posts = query.filter(
        not_(Post.interest_id.in_(user_interest_ids))
    ).order_by(desc(Post.created_at), desc(Post.id)).offset((page - 1) * discovery_target).limit(discovery_target).all()

    combined = [
        (
            p,
            f"Matches your interest: {p.interest.name}"
            if p.interest_id in user_interest_set
            else f"Discovery: Explore {p.interest.name}"
        )
        for p in (selected_posts + discovery_posts)
    ]
    # Strictly newest posts at the top
    combined.sort(key=lambda pair: (pair[0].created_at, pair[0].id), reverse=True)

    return format_interleaved_posts(combined, current_user)

def format_posts(posts: List[Post], current_user: User, default_reason: str) -> List[dict]:
    result = []
    user_likes = {r.post_id for r in current_user.reactions if r.reaction_type == "like" and r.post_id}
    user_saves = {r.post_id for r in current_user.reactions if r.reaction_type == "save" and r.post_id}

    for p in posts:
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "author_username": p.author.username if p.author else "creator",
            "author_display_name": p.author.display_name if p.author else "Creator",
            "author_avatar": p.author.avatar_url if p.author else None,
            "author_is_verified": p.author.is_verified if p.author else False,
            "content_type": p.content_type,
            "media_url": p.media_url,
            "caption": p.caption,
            "location": p.location,
            "interest_id": p.interest_id,
            "interest_name": p.interest.name if p.interest else "General",
            "interest_gradient": p.interest.gradient if p.interest else "from-pink-500 to-rose-500",
            "community_id": p.community_id,
            "community_name": p.community.name if p.community else None,
            "audience": p.audience,
            "is_ai_generated": p.is_ai_generated,
            "ai_label_explanation": p.ai_label_explanation,
            "is_flagged": p.is_flagged,
            "flag_reason": p.flag_reason,
            "moderation_status": p.moderation_status,
            "under_review_badge": p.under_review_badge,
            "likes_count": p.likes_count,
            "comments_count": p.comments_count,
            "has_liked": p.id in user_likes,
            "has_saved": p.id in user_saves,
            "created_at": p.created_at,
            "recommendation_reason": default_reason
        })
    return result

def format_interleaved_posts(items: List[tuple], current_user: User) -> List[dict]:
    result = []
    user_likes = {r.post_id for r in current_user.reactions if r.reaction_type == "like" and r.post_id}
    user_saves = {r.post_id for r in current_user.reactions if r.reaction_type == "save" and r.post_id}

    for p, reason in items:
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "author_username": p.author.username if p.author else "creator",
            "author_display_name": p.author.display_name if p.author else "Creator",
            "author_avatar": p.author.avatar_url if p.author else None,
            "author_is_verified": p.author.is_verified if p.author else False,
            "content_type": p.content_type,
            "media_url": p.media_url,
            "caption": p.caption,
            "location": p.location,
            "interest_id": p.interest_id,
            "interest_name": p.interest.name if p.interest else "General",
            "interest_gradient": p.interest.gradient if p.interest else "from-pink-500 to-rose-500",
            "community_id": p.community_id,
            "community_name": p.community.name if p.community else None,
            "audience": p.audience,
            "is_ai_generated": p.is_ai_generated,
            "ai_label_explanation": p.ai_label_explanation,
            "is_flagged": p.is_flagged,
            "flag_reason": p.flag_reason,
            "moderation_status": p.moderation_status,
            "under_review_badge": p.under_review_badge,
            "likes_count": p.likes_count,
            "comments_count": p.comments_count,
            "has_liked": p.id in user_likes,
            "has_saved": p.id in user_saves,
            "created_at": p.created_at,
            "recommendation_reason": reason
        })
    return result

def _rank_reels_instagram_order(reels: List[Reel], limit: int) -> List[Reel]:
    """
    Order reels like Instagram:
    Priority reels come first (most viewed, most liked, and recently uploaded),
    followed by remaining reels ordered by engagement & recency.
    """
    if not reels:
        return []

    by_recent = sorted(reels, key=lambda r: (r.created_at, r.id), reverse=True)
    by_views = sorted(reels, key=lambda r: (r.views_count or 0, r.likes_count or 0, r.created_at), reverse=True)
    by_likes = sorted(reels, key=lambda r: (r.likes_count or 0, r.views_count or 0, r.created_at), reverse=True)

    ordered: List[Reel] = []
    seen_ids = set()

    def _add(reel_obj: Reel):
        if reel_obj.id not in seen_ids:
            seen_ids.add(reel_obj.id)
            ordered.append(reel_obj)

    # First bring top recently uploaded, most viewed, and most liked reels to the front
    for group in (by_recent[:2], by_views[:3], by_likes[:3]):
        for item in group:
            _add(item)

    # Then remaining reels sorted by views, likes, recency
    for item in by_views:
        _add(item)

    return ordered[:limit]

def get_feed_reels(
    db: Session,
    current_user: User,
    limit: int = 15
) -> List[dict]:
    """
    Reels discovery logic:
    - Ordered like Instagram: recently uploaded, most viewed, and most liked first, then remaining reels
    - Focus Mode OFF -> prioritized interests + controlled discovery
    - Focus Mode ON -> strict filtering by mode's selected interests
    - Kids Mode -> only child-approved reels (Learning and Art)
    """
    blocked_ids, _, following_ids, private_user_ids = _get_visibility_context(db, current_user)
    non_followed_private = [uid for uid in private_user_ids if uid != current_user.id and uid not in following_ids]

    query = db.query(Reel).filter(
        Reel.moderation_status == "approved",
        Reel.user_id.notin_(blocked_ids) if blocked_ids else True,
        Reel.user_id.notin_(non_followed_private) if non_followed_private else True
    )

    is_child = current_user.account_type == "child" or current_user.is_kids_mode or current_user.kids_preview_mode
    if is_child:
        permitted_interests = db.query(Interest.id).filter(Interest.is_child_permitted == True).all()
        child_interest_ids = [i[0] for i in permitted_interests]
        query = query.filter(
            Reel.interest_id.in_(child_interest_ids),
            Reel.is_child_approved == True
        )
        reels = _rank_reels_instagram_order(query.all(), limit)
        return format_reels(reels, current_user, "Child-Safe Reel: Approved for young creators", following_ids)

    active_focus = db.query(FocusMode).filter(
        or_(FocusMode.user_id == current_user.id, FocusMode.is_system_default == True),
        FocusMode.is_active == True
    ).first()

    if active_focus and active_focus.selected_interest_ids:
        query = query.filter(Reel.interest_id.in_(active_focus.selected_interest_ids))
        reels = _rank_reels_instagram_order(query.all(), limit)
        return format_reels(reels, current_user, f"Focus Mode: {active_focus.name}", following_ids)

    # Focus Mode OFF: Prioritized interests + cross-interest discovery, ranked by recency/views/likes
    user_interest_ids = [i.id for i in current_user.interests]
    if user_interest_ids:
        matched = query.filter(Reel.interest_id.in_(user_interest_ids)).all()
        discovery = query.filter(not_(Reel.interest_id.in_(user_interest_ids))).all()
        ranked_matched = _rank_reels_instagram_order(matched, max(1, int(limit * 0.7)))
        ranked_discovery = _rank_reels_instagram_order(discovery, max(1, limit - len(ranked_matched)))
        all_reels = _rank_reels_instagram_order(ranked_matched + ranked_discovery, limit)
    else:
        all_reels = _rank_reels_instagram_order(query.all(), limit)

    return format_reels(all_reels, current_user, "Discover Reels", following_ids)

def format_reels(reels: List[Reel], current_user: User, default_reason: str, following_ids: Optional[List[int]] = None) -> List[dict]:
    result = []
    following_set = set(following_ids or [])
    user_likes = {r.reel_id for r in current_user.reactions if r.reaction_type == "like" and r.reel_id}
    user_saves = {r.reel_id for r in current_user.reactions if r.reaction_type == "save" and r.reel_id}

    for r in reels:
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "author_username": r.author.username if r.author else "creator",
            "author_display_name": r.author.display_name if r.author else "Creator",
            "author_avatar": r.author.avatar_url if r.author else None,
            "author_is_verified": r.author.is_verified if r.author else False,
            "is_following_author": r.user_id in following_set,
            "video_url": r.video_url,
            "thumbnail_url": r.thumbnail_url,
            "caption": r.caption,
            "interest_id": r.interest_id,
            "interest_name": r.interest.name if r.interest else "General",
            "interest_gradient": r.interest.gradient if r.interest else "from-pink-500 to-rose-500",
            "audio_title": r.audio_title,
            "is_ai_generated": r.is_ai_generated,
            "ai_label_explanation": r.ai_label_explanation,
            "moderation_status": r.moderation_status,
            "is_child_approved": r.is_child_approved,
            "likes_count": r.likes_count,
            "comments_count": r.comments_count,
            "shares_count": r.shares_count,
            "saves_count": r.saves_count,
            "views_count": r.views_count or 0,
            "has_liked": r.id in user_likes,
            "has_saved": r.id in user_saves,
            "duration_seconds": r.duration_seconds,
            "created_at": r.created_at,
            "recommendation_reason": default_reason
        })
    return result
