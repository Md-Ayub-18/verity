import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Verity API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database: Supports PostgreSQL (normalizing postgres:// -> postgresql://) or fallback to SQLite
    _raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./verity.db")
    DATABASE_URL: str = _raw_db_url.replace("postgres://", "postgresql://", 1) if _raw_db_url.startswith("postgres://") else _raw_db_url
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "verity_super_secret_jwt_key_responsibly_built_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Upload paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    
    # FFmpeg executable path
    FFMPEG_PATH: str = os.getenv(
        "FFMPEG_PATH",
        r"C:\Users\Giri\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
    )

settings = Settings()

# Ensure upload subdirectories exist
for subdir in ["posts", "reels", "avatars", "stitch", "temp"]:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, subdir), exist_ok=True)
