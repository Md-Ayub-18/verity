import os
import subprocess
import logging
import uuid
from typing import List, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

def _get_ffmpeg_bin() -> str:
    if os.path.exists(settings.FFMPEG_PATH):
        return settings.FFMPEG_PATH
    return "ffmpeg"

def _resolve_local_path(url_or_path: str) -> str:
    """Resolve an /uploads/... URL or relative path to an absolute local file path."""
    if url_or_path.startswith("/uploads/"):
        rel = url_or_path[len("/uploads/"):].lstrip("/\\")
        return os.path.join(settings.UPLOAD_DIR, rel)
    if os.path.exists(url_or_path):
        return url_or_path
    # Check basename inside uploads/stitch or uploads/reels
    base = os.path.basename(url_or_path)
    for sub in ("stitch", "reels", "posts"):
        candidate = os.path.join(settings.UPLOAD_DIR, sub, base)
        if os.path.exists(candidate):
            return candidate
    return ""

def _has_audio_stream(ffmpeg_bin: str, file_path: str) -> bool:
    """Probe a video file using ffmpeg -i to see if it contains an audio stream."""
    try:
        res = subprocess.run(
            [ffmpeg_bin, "-i", file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )
        info = res.stderr.decode("utf-8", errors="ignore")
        return "Audio:" in info
    except Exception:
        return False

def check_ffmpeg() -> bool:
    ffmpeg_bin = _get_ffmpeg_bin()
    try:
        res = subprocess.run([ffmpeg_bin, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        return res.returncode == 0
    except Exception:
        return False

def stitch_video_clips(project_id: int, clip_paths: List[str]) -> Tuple[bool, str, str]:
    """
    Stitches multiple MP4 clips using FFmpeg filter_complex normalization.
    Handles varying resolutions, codecs, and missing audio streams safely.
    Returns (success, output_url, error_message).
    """
    if not clip_paths:
        return False, "", "No approved clips provided for stitching."

    output_dir = os.path.join(settings.UPLOAD_DIR, "stitch")
    os.makedirs(output_dir, exist_ok=True)
    output_filename = f"stitch_project_{project_id}_{uuid.uuid4().hex[:6]}_final.mp4"
    output_path = os.path.join(output_dir, output_filename)
    ffmpeg_bin = _get_ffmpeg_bin()

    local_clips = []
    for p in clip_paths:
        resolved = _resolve_local_path(p)
        if resolved and os.path.exists(resolved):
            local_clips.append(resolved)

    if not local_clips:
        return False, "", "None of the approved clip files could be found on disk."

    try:
        # Single clip: copy/transcode directly to faststart MP4
        if len(local_clips) == 1:
            cmd = [
                ffmpeg_bin, "-y",
                "-i", local_clips[0],
                "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast",
                "-c:a", "aac", "-movflags", "+faststart",
                output_path
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
            if result.returncode == 0 and os.path.exists(output_path):
                return True, f"/uploads/stitch/{output_filename}", ""

        # Multiple clips: normalize resolution (1280x720), fps=30, pixel format & audio
        cmd = [ffmpeg_bin, "-y"]
        filter_parts = []
        concat_inputs = []
        all_have_audio = all(_has_audio_stream(ffmpeg_bin, c) for c in local_clips)

        for idx, clip_path in enumerate(local_clips):
            cmd.extend(["-i", clip_path])
            filter_parts.append(
                f"[{idx}:v]scale=1280:720:force_original_aspect_ratio=decrease,"
                f"pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v{idx}]"
            )
            if all_have_audio:
                filter_parts.append(
                    f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{idx}]"
                )
                concat_inputs.append(f"[v{idx}][a{idx}]")
            else:
                concat_inputs.append(f"[v{idx}]")

        n = len(local_clips)
        if all_have_audio:
            filter_parts.append(f"{''.join(concat_inputs)}concat=n={n}:v=1:a=1[outv][outa]")
            map_args = ["-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac"]
        else:
            filter_parts.append(f"{''.join(concat_inputs)}concat=n={n}:v=1:a=0[outv]")
            map_args = ["-map", "[outv]", "-c:v", "libx264", "-preset", "veryfast", "-an"]

        cmd.extend(["-filter_complex", ";".join(filter_parts)])
        cmd.extend(map_args)
        cmd.extend(["-movflags", "+faststart", output_path])

        logger.info(f"Running FFmpeg stitch command for project {project_id}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)

        if result.returncode == 0 and os.path.exists(output_path):
            return True, f"/uploads/stitch/{output_filename}", ""

        stderr_msg = result.stderr.decode("utf-8", errors="ignore")
        logger.error(f"FFmpeg stitch failed: {stderr_msg[-400:]}")
        return False, "", f"FFmpeg error: {stderr_msg[-250:]}"

    except Exception as e:
        logger.error(f"Error during video stitching: {str(e)}")
        return False, "", str(e)


def generate_video_thumbnail(video_url: str, subfolder: str = "reels") -> str:
    """Extracts a JPEG poster frame from a local video using FFmpeg; returns /uploads/... URL or empty string."""
    local_video = _resolve_local_path(video_url)
    if not local_video or not os.path.exists(local_video):
        return ""

    thumb_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(thumb_dir, exist_ok=True)
    thumb_filename = f"thumb_{uuid.uuid4().hex[:10]}.jpg"
    thumb_path = os.path.join(thumb_dir, thumb_filename)
    ffmpeg_bin = _get_ffmpeg_bin()

    for seek_ts in ("00:00:00.8", "00:00:00.1"):
        try:
            cmd = [
                ffmpeg_bin, "-y",
                "-ss", seek_ts,
                "-i", local_video,
                "-vframes", "1",
                "-q:v", "2",
                thumb_path,
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            if res.returncode == 0 and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
                return f"/uploads/{subfolder}/{thumb_filename}"
        except Exception as exc:
            logger.warning(f"Thumbnail generation failed at {seek_ts}: {exc}")
    return ""
