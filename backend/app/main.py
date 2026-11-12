import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database

# Routers
from app.routers import (
    auth, interests, focus_modes, posts, reels, 
    stories, users, communities, stitch, 
    moderation, screen_time, upload, notifications
)

# Ensure existing DBs get new columns cleanly before table creation/seeding
def _ensure_schema_columns():
    insp = inspect(engine)
    if insp.has_table("users"):
        cols = {c["name"] for c in insp.get_columns("users")}
        if "default_audience" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN default_audience VARCHAR(20) DEFAULT 'public'"))
        if "kids_lock_code" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN kids_lock_code VARCHAR(50)"))
    if insp.has_table("posts"):
        post_cols = {c["name"] for c in insp.get_columns("posts")}
        if "flag_reason" not in post_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE posts ADD COLUMN flag_reason VARCHAR(255)"))
    if insp.has_table("reels"):
        reel_cols = {c["name"] for c in insp.get_columns("reels")}
        if "views_count" not in reel_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE reels ADD COLUMN views_count INTEGER DEFAULT 0"))

def _init_database_with_retry(max_attempts: int = 5, delay_seconds: float = 2.0):
    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            _ensure_schema_columns()
            Base.metadata.create_all(bind=engine)
            _db = SessionLocal()
            try:
                seed_database(_db)
            finally:
                _db.close()
            return
        except Exception as exc:
            last_err = exc
            if attempt < max_attempts:
                time.sleep(delay_seconds)
    raise last_err

_init_database_with_retry()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Verity: Responsible Social Media Platform — API",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads (avatars, posts, reels, stitches)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers with /api/v1 prefix
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(interests.router, prefix=api_v1)
app.include_router(focus_modes.router, prefix=api_v1)
app.include_router(posts.router, prefix=api_v1)
app.include_router(reels.router, prefix=api_v1)
app.include_router(stories.router, prefix=api_v1)
app.include_router(users.router, prefix=api_v1)
app.include_router(communities.router, prefix=api_v1)
app.include_router(stitch.router, prefix=api_v1)
app.include_router(moderation.router, prefix=api_v1)
app.include_router(screen_time.router, prefix=api_v1)
app.include_router(upload.router, prefix=api_v1)
app.include_router(notifications.router, prefix=api_v1)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "verity-backend", "version": settings.VERSION}

@app.get("/ready")
def readiness_check():
    return {"ready": True, "database": "connected"}

@app.get("/")
def root():
    return {
        "message": "Welcome to Verity API. Your Interests. Your Feed. Your Control.",
        "docs": "/docs",
        "api_v1": api_v1
    }
