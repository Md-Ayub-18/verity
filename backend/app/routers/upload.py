import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.config import settings
from app.models import User
from app.security import get_current_user

router = APIRouter(prefix="/upload", tags=["Media Upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def _verify_magic_bytes(header: bytes, content_type: str) -> bool:
    """Inspect leading magic bytes to ensure uploaded file matches declared media type."""
    if len(header) < 12:
        return False
    if content_type == "image/jpeg":
        return header.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return header.startswith(b"GIF87a") or header.startswith(b"GIF89a")
    if content_type == "image/webp":
        return header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    if content_type in ("video/mp4", "video/quicktime"):
        return header[4:8] == b"ftyp" or b"moov" in header[:32]
    if content_type == "video/webm":
        return header.startswith(b"\x1a\x45\xdf\xa3")
    return False

@router.post("/media")
async def upload_media(
    file: UploadFile = File(...),
    media_category: str = "posts",
    current_user: User = Depends(get_current_user)
):
    """Validates MIME type, magic bytes, and size (max 50MB) before storing uploaded media."""
    if file.content_type not in ALLOWED_IMAGE_TYPES and file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format ({file.content_type}). Supported: JPEG, PNG, WEBP, GIF, MP4, WEBM."
        )

    category = media_category if media_category in ["posts", "reels", "stitch", "avatars"] else "posts"
    target_dir = os.path.join(settings.UPLOAD_DIR, category)
    os.makedirs(target_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"}:
        ext = ".jpg" if "image" in file.content_type else ".mp4"

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(target_dir, unique_filename)

    total_bytes = 0
    header_checked = False
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                if not header_checked:
                    header_checked = True
                    if not _verify_magic_bytes(chunk[:32], file.content_type):
                        raise HTTPException(
                            status_code=400,
                            detail="File contents do not match the declared media type."
                        )
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Uploaded file exceeds the 50 MB size limit."
                    )
                buffer.write(chunk)
    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    return {
        "url": f"/uploads/{category}/{unique_filename}",
        "content_type": file.content_type,
        "filename": unique_filename,
        "size_bytes": total_bytes
    }
