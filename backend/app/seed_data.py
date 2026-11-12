from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import (
    User, Interest, FocusMode, Post, Reel, Story, 
    Community, CommunityMember, StitchProject, StitchContribution,
    Report, BotSignal, BullyingSignal
)
from app.security import get_password_hash

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Interest).count() > 0:
        return

    print("Seeding initial Verity database with rich Instagram-style data...")

    # 1. Primary Interests (The 7 Pillars)
    interests_data = [
        {"name": "Learning", "slug": "learning", "description": "Science, history, skills, and educational discovery.", "icon": "BookOpen", "gradient": "from-blue-500 to-cyan-500", "is_child_permitted": True},
        {"name": "Sports", "slug": "sports", "description": "Athletics, fitness routines, highlights, and workouts.", "icon": "Trophy", "gradient": "from-amber-500 to-orange-500", "is_child_permitted": False},
        {"name": "Art", "slug": "art", "description": "Painting, design, photography, sculpture, and crafts.", "icon": "Palette", "gradient": "from-fuchsia-500 to-pink-500", "is_child_permitted": True},
        {"name": "Technology", "slug": "technology", "description": "Coding, AI breakthroughs, robotics, gadgets, and software.", "icon": "Cpu", "gradient": "from-cyan-400 to-blue-600", "is_child_permitted": False},
        {"name": "Entertainment", "slug": "entertainment", "description": "Cinema, music performances, comedy, and gaming.", "icon": "Film", "gradient": "from-rose-500 to-red-600", "is_child_permitted": False},
        {"name": "Personal Stories", "slug": "personal-stories", "description": "Inspiring life journeys, memoirs, and daily experiences.", "icon": "Heart", "gradient": "from-emerald-400 to-teal-600", "is_child_permitted": False},
        {"name": "Social Causes", "slug": "social-causes", "description": "Climate action, volunteering, community aid, and equity.", "icon": "Globe", "gradient": "from-violet-500 to-purple-600", "is_child_permitted": False},
    ]

    interest_objs = {}
    for i_data in interests_data:
        obj = Interest(**i_data)
        db.add(obj)
        db.flush()
        interest_objs[obj.slug] = obj

    # 2. System Default Focus Modes
    focus_modes_data = [
        {
            "name": "Study Mode",
            "emoji": "📚",
            "description": "Deep educational immersion. Only Learning & Technology content.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["learning"].id, interest_objs["technology"].id],
            "focus_duration_minutes": 50
        },
        {
            "name": "Casual Mode",
            "emoji": "☕",
            "description": "Relax and unwind with entertainment, personal stories, and sports.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["entertainment"].id, interest_objs["personal-stories"].id, interest_objs["sports"].id],
            "focus_duration_minutes": 30
        },
        {
            "name": "Creative Mode",
            "emoji": "🎨",
            "description": "Inspire your next masterpiece with Art and creative Technology.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["art"].id, interest_objs["technology"].id],
            "focus_duration_minutes": 45
        },
        {
            "name": "Technology Mode",
            "emoji": "💻",
            "description": "Curated frontier engineering, software, and hardware.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["technology"].id],
            "focus_duration_minutes": 60
        },
        {
            "name": "Sports Mode",
            "emoji": "⚡",
            "description": "High-energy training, highlights, and fitness motivation.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["sports"].id],
            "focus_duration_minutes": 45
        },
        {
            "name": "Kids Mode",
            "emoji": "🧸",
            "description": "Child-safe environment restricted strictly to Learning & Art.",
            "is_system_default": True,
            "is_active": False,
            "selected_interest_ids": [interest_objs["learning"].id, interest_objs["art"].id],
            "focus_duration_minutes": 30
        }
    ]

    for fm_data in focus_modes_data:
        fm = FocusMode(
            user_id=None,
            name=fm_data["name"],
            emoji=fm_data["emoji"],
            description=fm_data["description"],
            is_system_default=True,
            is_active=False,
            focus_duration_minutes=fm_data["focus_duration_minutes"]
        )
        fm.selected_interest_ids = fm_data["selected_interest_ids"]
        db.add(fm)

    # 3. Seed Users
    # 3a. Mila Anderson (From reference images!)
    mila = User(
        email="mila@verity.app",
        username="mila.creates",
        display_name="Mila Anderson",
        password_hash=get_password_hash("password123"),
        birth_date="1998-05-14",
        age=28,
        account_type="adult",
        is_verified=True,
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        bio="Finding beauty in everyday life and little moments ✨ Photographer & Creator.",
        daily_screen_time_limit=60,
        screen_time_used_today=15.0
    )
    mila.interests.extend([interest_objs["art"], interest_objs["personal-stories"], interest_objs["technology"]])
    db.add(mila)

    # 3b. Giri (Primary adult user)
    giri = User(
        email="giri@verity.app",
        username="giri",
        display_name="Giri",
        password_hash=get_password_hash("password123"),
        birth_date="2000-01-01",
        age=26,
        account_type="adult",
        is_moderator=True, # also equipped to test moderator features
        is_admin=True,
        is_verified=True,
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
        bio="Full-stack engineer building responsible social experiences 🚀",
        daily_screen_time_limit=60,
        screen_time_used_today=12.0
    )
    giri.interests.extend([interest_objs["technology"], interest_objs["learning"], interest_objs["art"]])
    db.add(giri)
    db.commit() # Ensure giri.id is generated

    # 3c. Alex Chen (Moderator)
    alex = User(
        email="moderator@verity.app",
        username="alex_mod",
        display_name="Alex Chen",
        password_hash=get_password_hash("password123"),
        birth_date="1995-08-20",
        age=31,
        account_type="adult",
        is_moderator=True,
        is_verified=True,
        avatar_url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400",
        bio="Verity Trust & Safety Moderator 🛡️ Keeping our digital community safe.",
        daily_screen_time_limit=90,
        screen_time_used_today=25.0
    )
    alex.interests.extend([interest_objs["social-causes"], interest_objs["technology"]])
    db.add(alex)

    # 3d. Sammy Kid (Child account, age 9, ward of Giri)
    sammy = User(
        email="sammy@verity.app",
        username="sammy_kid",
        display_name="Sammy",
        password_hash=get_password_hash("password123"),
        birth_date="2017-06-12",
        age=9,
        account_type="child",
        is_kids_mode=True,
        guardian_id=giri.id,
        is_guardian_verified=True,
        daily_screen_time_limit=30, # child default 30 min
        screen_time_used_today=8.0,
        dms_enabled=False,
        avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=sammy_kid",
        bio="I love drawing dinosaurs and learning about space! 🦕🚀"
    )
    sammy.interests.extend([interest_objs["learning"], interest_objs["art"]])
    db.add(sammy)

    # 3e. Additional creator accounts
    marcus = User(
        email="marcus@verity.app",
        username="marcus.art",
        display_name="Marcus Vance",
        password_hash=get_password_hash("password123"),
        birth_date="1999-03-22",
        age=27,
        is_verified=True,
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        bio="Digital 3D artist exploring neon brutalism and surreal forms 🎨",
        daily_screen_time_limit=60
    )
    marcus.interests.extend([interest_objs["art"], interest_objs["technology"]])
    db.add(marcus)

    elena = User(
        email="elena@verity.app",
        username="elena_science",
        display_name="Dr. Elena Rostova",
        password_hash=get_password_hash("password123"),
        birth_date="1992-11-05",
        age=34,
        is_verified=True,
        avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
        bio="Astrophysics communicator 🔭 Making cosmos mysteries easy to understand.",
        daily_screen_time_limit=60
    )
    elena.interests.extend([interest_objs["learning"], interest_objs["social-causes"]])
    db.add(elena)

    db.commit()

    # 4. Topic Communities
    comm_tech = Community(
        name="Tech Frontiers",
        slug="technology",
        description="Exploring artificial intelligence, distributed systems, and open hardware.",
        rules="1. Be constructive. 2. Cite your sources. 3. No unauthorized promotional spam.",
        icon_url="https://images.unsplash.com/photo-1518770660439-4636190af475?w=200",
        interest_id=interest_objs["technology"].id,
        created_by_id=giri.id,
        member_count=420,
        is_child_safe=False
    )
    comm_art = Community(
        name="Creative Collective",
        slug="art",
        description="Share your paintings, renders, sketches, and design systems.",
        rules="1. Constructive feedback only. 2. Always credit collaborators.",
        icon_url="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200",
        interest_id=interest_objs["art"].id,
        created_by_id=mila.id,
        member_count=890,
        is_child_safe=True
    )
    comm_learn = Community(
        name="Curious Minds",
        slug="learning",
        description="Daily scientific wonders, book summaries, and skill-sharing tutorials.",
        rules="1. Family friendly. 2. Verify scientific claims before posting.",
        icon_url="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200",
        interest_id=interest_objs["learning"].id,
        created_by_id=elena.id,
        member_count=1340,
        is_child_safe=True
    )
    db.add_all([comm_tech, comm_art, comm_learn])
    db.commit()

    # 5. Posts (Inspired by the Reference Images!)
    posts_data = [
        # Reference Image 1 Right Screen: Mila Anderson post with red flowers
        {
            "user_id": mila.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900",
            "caption": "Your next chapter is waiting for you. Let go of what was, embrace the vibrant blooming ahead ❤️🔥",
            "location": "SoHo, New York",
            "interest_id": interest_objs["art"].id,
            "community_id": comm_art.id,
            "is_ai_generated": False,
            "likes_count": 48200,
            "comments_count": 2140
        },
        # Tech Post (AI Generative breakthrough with AI badge)
        {
            "user_id": giri.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900",
            "caption": "Exploring multi-modal latency optimizations with WebAssembly and local models. The boundary between native and web is officially gone.",
            "location": "San Francisco, CA",
            "interest_id": interest_objs["technology"].id,
            "community_id": comm_tech.id,
            "is_ai_generated": True,
            "ai_label_explanation": "Visual asset synthesized using diffusion modeling for benchmark illustration.",
            "likes_count": 1420,
            "comments_count": 89
        },
        # Learning / Astronomy Post (Child-safe)
        {
            "user_id": elena.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900",
            "caption": "Did you know that every atom of iron in your blood was forged inside the heart of an exploding star? We are quite literally made of stardust 🌌",
            "location": "Mauna Kea Observatory, Hawaii",
            "interest_id": interest_objs["learning"].id,
            "community_id": comm_learn.id,
            "is_ai_generated": False,
            "likes_count": 8950,
            "comments_count": 412
        },
        # Art / 3D Design Post
        {
            "user_id": marcus.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=900",
            "caption": "Experimenting with iridescent glass shaders in Blender 4.2. Refractions never fail to mesmerize me 💎",
            "location": "London, UK",
            "interest_id": interest_objs["art"].id,
            "community_id": comm_art.id,
            "is_ai_generated": False,
            "likes_count": 3410,
            "comments_count": 145
        },
        # Sports / Training Post
        {
            "user_id": giri.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900",
            "caption": "Consistency beats intensity every single time. 6:00 AM track drills done. What goal are you chasing today?",
            "location": "Olympic Stadium Track",
            "interest_id": interest_objs["sports"].id,
            "is_ai_generated": False,
            "likes_count": 2100,
            "comments_count": 78
        },
        # Entertainment / Music Post
        {
            "user_id": mila.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900",
            "caption": "Live acoustics at sunset. Sometimes the simplest chord progression captures what thousands of words cannot 🎸",
            "location": "Austin, Texas",
            "interest_id": interest_objs["entertainment"].id,
            "is_ai_generated": False,
            "likes_count": 6430,
            "comments_count": 230
        },
        # Personal Stories Post
        {
            "user_id": mila.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900",
            "caption": "Three years ago I quit a safe corporate role to pursue visual storytelling. It was terrifying, but living with intention changed everything.",
            "location": "Yosemite Valley",
            "interest_id": interest_objs["personal-stories"].id,
            "is_ai_generated": False,
            "likes_count": 12800,
            "comments_count": 520
        },
        # Social Causes Post
        {
            "user_id": elena.id,
            "content_type": "photo",
            "media_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900",
            "caption": "Planting 5,000 native mangrove trees along the coastline today with our volunteer team. Small acts scale into massive protection for our shores 🌱",
            "location": "Coral Triangle Conservation Area",
            "interest_id": interest_objs["social-causes"].id,
            "is_ai_generated": False,
            "likes_count": 9100,
            "comments_count": 310
        },
        # Flagged post for demonstration of Moderation Dashboard
        {
            "user_id": marcus.id,
            "content_type": "text",
            "caption": "CLICK HERE TO WIN FREE CRYPTO! Instant $10,000 payout if you follow back right now!",
            "interest_id": interest_objs["technology"].id,
            "is_flagged": True,
            "flag_reason": "Commercial Spam / Scam",
            "moderation_status": "pending_review",
            "under_review_badge": True,
            "likes_count": 2,
            "comments_count": 1
        }
    ]

    seeded_posts = []
    for p_data in posts_data:
        p = Post(**p_data)
        db.add(p)
        seeded_posts.append(p)
    db.flush()  # Assign primary keys on PostgreSQL before referencing Post.id in Reports

    # 6. Stories (Stories tray at top)
    stories_data = [
        {"user_id": mila.id, "media_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600", "caption": "Behind the lens in NYC 📸", "is_live": True, "interest_id": interest_objs["art"].id},
        {"user_id": elena.id, "media_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600", "caption": "Solar flare capture! ☀️", "is_live": False, "interest_id": interest_objs["learning"].id},
        {"user_id": marcus.id, "media_url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600", "caption": "Texture test #4", "is_live": False, "interest_id": interest_objs["art"].id},
        {"user_id": giri.id, "media_url": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600", "caption": "Morning mobility", "is_live": False, "interest_id": interest_objs["sports"].id},
    ]

    now = datetime.now(timezone.utc)
    for s_data in stories_data:
        s = Story(
            user_id=s_data["user_id"],
            media_url=s_data["media_url"],
            media_type="photo",
            caption=s_data["caption"],
            interest_id=s_data["interest_id"],
            is_live=s_data["is_live"],
            expires_at=now + timedelta(hours=22)
        )
        db.add(s)

    # 7. Reels
    reels_data = [
        {
            "user_id": mila.id,
            "video_url": "/uploads/reels/reel_art.mp4",
            "thumbnail_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
            "caption": "Golden hour lighting techniques in under 30 seconds ✨ #photography #creative",
            "interest_id": interest_objs["art"].id,
            "audio_title": "Mila Anderson · Golden Hour Beats",
            "likes_count": 89400,
            "comments_count": 1240,
            "views_count": 312000,
            "is_child_approved": True
        },
        {
            "user_id": elena.id,
            "video_url": "/uploads/reels/reel_learning.mp4",
            "thumbnail_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
            "caption": "How deep is the Mariana Trench? Visualizing Earth's deepest mystery 🌊 #science #learning",
            "interest_id": interest_objs["learning"].id,
            "audio_title": "Cosmic Explorations · Ambient Flow",
            "likes_count": 54200,
            "comments_count": 830,
            "views_count": 195000,
            "is_child_approved": True
        },
        {
            "user_id": giri.id,
            "video_url": "/uploads/reels/reel_tech.mp4",
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
            "caption": "Building a custom reactive state machine with zero dependencies. Clean code walkthrough 💻 #coding #tech",
            "interest_id": interest_objs["technology"].id,
            "audio_title": "Synthesizer Wave · Lofi Study",
            "likes_count": 21800,
            "comments_count": 450,
            "views_count": 84500,
            "is_child_approved": False
        },
        {
            "user_id": marcus.id,
            "video_url": "/uploads/reels/reel_3d.mp4",
            "thumbnail_url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600",
            "caption": "Procedural rock geometry in Unreal Engine 5.4. Lighting comparison breakdown 🎨",
            "interest_id": interest_objs["art"].id,
            "audio_title": "Ambient Glitch · Chill Vibes",
            "likes_count": 33100,
            "comments_count": 610,
            "views_count": 124000,
            "is_child_approved": True
        }
    ]

    for r_data in reels_data:
        r = Reel(**r_data)
        db.add(r)

    # 8. Collaborative Stitch Studio Project
    stitch_proj = StitchProject(
        title="Global Creativity Relay 2026",
        description="A collaborative video stitching creators from 10 cities showcasing one continuous brush stroke.",
        creator_id=mila.id,
        status="collecting"
    )
    db.add(stitch_proj)
    db.flush()

    contrib1 = StitchContribution(
        project_id=stitch_proj.id,
        user_id=mila.id,
        video_url="/uploads/stitch/clip_part1.mp4",
        caption="Part 1: Starting stroke in red oil paint",
        consent_given=True,
        status="approved",
        order_index=1
    )
    contrib2 = StitchContribution(
        project_id=stitch_proj.id,
        user_id=marcus.id,
        video_url="/uploads/stitch/clip_part2.mp4",
        caption="Part 2: Transition into 3D digital voxel brush",
        consent_given=True,
        status="approved",
        order_index=2
    )
    contrib3 = StitchContribution(
        project_id=stitch_proj.id,
        user_id=giri.id,
        video_url="/uploads/stitch/clip_part3.mp4",
        caption="Part 3: Final signature & render wrap",
        consent_given=True,
        status="pending", # awaiting approval
        order_index=3
    )
    db.add_all([contrib1, contrib2, contrib3])

    # 9. Moderation Reports & Bot Signals for Dashboard
    flagged_post_id = seeded_posts[-1].id if seeded_posts else None
    rep1 = Report(
        reporter_id=giri.id,
        post_id=flagged_post_id, # The crypto spam post
        reported_user_id=marcus.id,
        reason="spam",
        description="Repetitive deceptive crypto payout link detected on user feed.",
        status="pending"
    )
    bot1 = BotSignal(
        user_id=marcus.id,
        anomaly_score=0.88,
        rapid_action_count=142,
        flags_detected_json='["rapid_likes_burst", "high_frequency_comments", "unusual_ip_switching"]',
        status="suspicious"
    )
    bullying1 = BullyingSignal(
        target_user_id=mila.id,
        actor_user_id=marcus.id,
        repeated_flagged_interactions=3,
        signal_severity="medium"
    )
    db.add_all([rep1, bot1, bullying1])

    db.commit()
    print("Verity database seeded successfully with rich demo data!")
