from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    User, Post, Reel, Comment, Report, ModerationLog, 
    BotSignal, BullyingSignal, ModerationAppeal
)
from app.schemas import (
    ReportOut, ModerationActionIn, ModerationLogOut, 
    BotSignalOut, BullyingSignalOut, PostOut,
    ModerationAppealCreate, ModerationAppealOut
)
from app.security import get_current_user, require_moderator
from app.services.feed_service import format_posts
from app.routers.notifications import create_notification

router = APIRouter(prefix="/moderation", tags=["Moderation Dashboard"])

@router.get("/summary")
def get_moderation_summary(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    pending_reports = db.query(Report).filter(Report.status == "pending").count()
    flagged_posts = db.query(Post).filter(Post.is_flagged == True, Post.moderation_status == "pending_review").count()
    suspicious_bots = db.query(BotSignal).filter(BotSignal.status == "suspicious").count()
    bullying_alerts = db.query(BullyingSignal).count()

    return {
        "pending_reports_count": pending_reports,
        "flagged_posts_count": flagged_posts,
        "suspicious_bots_count": suspicious_bots,
        "bullying_signals_count": bullying_alerts
    }

@router.get("/flagged-posts", response_model=List[PostOut])
def get_flagged_posts(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    posts = db.query(Post).filter(
        Post.is_flagged == True
    ).order_by(desc(Post.created_at)).all()
    return format_posts(posts, current_user, "Flagged for safety review")

@router.get("/reports", response_model=List[ReportOut])
def get_reports(
    status: str = "pending",
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    reports = db.query(Report).filter(Report.status == status).order_by(desc(Report.created_at)).all()
    result = []
    for r in reports:
        result.append(ReportOut(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_username=r.reporter.username if r.reporter else "anonymous",
            post_id=r.post_id,
            reel_id=r.reel_id,
            reported_user_id=r.reported_user_id,
            reported_username=r.reported_user.username if r.reported_user else None,
            reason=r.reason,
            description=r.description,
            status=r.status,
            moderator_notes=r.moderator_notes,
            created_at=r.created_at
        ))
    return result

@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    action: str, # resolve, dismiss
    notes: str = "",
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    report.status = "resolved" if action == "resolve" else "dismissed"
    report.moderator_notes = notes
    report.resolved_by_id = current_user.id
    db.commit()

    log = ModerationLog(
        moderator_id=current_user.id,
        entity_type="report",
        entity_id=report.id,
        action=action,
        previous_state="pending",
        new_state=report.status,
        reason=notes or f"Report {action}d by moderator."
    )
    db.add(log)
    db.commit()

    return {"message": f"Report {report.status} successfully."}

@router.post("/posts/{post_id}/action")
def take_post_action(
    post_id: int,
    action_in: ModerationActionIn,
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    prev = post.moderation_status
    if action_in.action == "approve":
        post.moderation_status = "approved"
        post.is_flagged = False
        post.flag_reason = None
        post.under_review_badge = False
    elif action_in.action == "reject" or action_in.action == "remove":
        post.moderation_status = "rejected"
        post.is_flagged = True
        post.flag_reason = action_in.reason or post.flag_reason or "Removed by moderation"
    elif action_in.action == "flag":
        post.is_flagged = True
        post.moderation_status = "pending_review"
        post.flag_reason = action_in.reason or post.flag_reason or "Flagged for safety review"
        post.under_review_badge = True

    log = ModerationLog(
        moderator_id=current_user.id,
        entity_type="post",
        entity_id=post.id,
        action=action_in.action,
        previous_state=prev,
        new_state=post.moderation_status,
        reason=action_in.reason
    )
    db.add(log)
    create_notification(
        db, post.user_id, current_user.id, "moderation",
        f"Moderator update on your post #{post.id}: {post.moderation_status} ({action_in.reason}).",
        "post", post.id
    )
    db.commit()

    return {"message": f"Post updated to {post.moderation_status}.", "status": post.moderation_status}

@router.get("/bots", response_model=List[BotSignalOut])
def get_bots(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    bots = db.query(BotSignal).order_by(desc(BotSignal.anomaly_score)).all()
    result = []
    for b in bots:
        result.append(BotSignalOut(
            id=b.id,
            user_id=b.user_id,
            username=b.user.username if b.user else "user",
            anomaly_score=b.anomaly_score,
            rapid_action_count=b.rapid_action_count,
            flags_detected=b.flags_detected,
            status=b.status,
            created_at=b.created_at
        ))
    return result

@router.get("/bullying", response_model=List[BullyingSignalOut])
def get_bullying_signals(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    signals = db.query(BullyingSignal).order_by(desc(BullyingSignal.repeated_flagged_interactions)).all()
    result = []
    for s in signals:
        result.append(BullyingSignalOut(
            id=s.id,
            target_user_id=s.target_user_id,
            target_username=s.target_user.username if s.target_user else "target",
            actor_user_id=s.actor_user_id,
            actor_username=s.actor_user.username if s.actor_user else "actor",
            repeated_flagged_interactions=s.repeated_flagged_interactions,
            signal_severity=s.signal_severity,
            created_at=s.created_at
        ))
    return result

@router.get("/audit-logs", response_model=List[ModerationLogOut])
def get_audit_logs(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    logs = db.query(ModerationLog).order_by(desc(ModerationLog.created_at)).limit(50).all()
    result = []
    for l in logs:
        result.append(ModerationLogOut(
            id=l.id,
            moderator_name=l.moderator.username if l.moderator else "System Safety Filter",
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            action=l.action,
            previous_state=l.previous_state,
            new_state=l.new_state,
            reason=l.reason,
            created_at=l.created_at
        ))
    return result

@router.post("/appeals", response_model=ModerationAppealOut)
def submit_appeal(
    appeal_in: ModerationAppealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = ModerationAppeal(
        user_id=current_user.id,
        entity_type=appeal_in.entity_type,
        entity_id=appeal_in.entity_id,
        reason=appeal_in.reason,
        status="pending"
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    return ModerationAppealOut(
        id=appeal.id,
        user_id=current_user.id,
        username=current_user.username,
        entity_type=appeal.entity_type,
        entity_id=appeal.entity_id,
        reason=appeal.reason,
        status=appeal.status,
        moderator_notes=appeal.moderator_notes,
        created_at=appeal.created_at
    )

@router.get("/appeals", response_model=List[ModerationAppealOut])
def list_appeals(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    appeals = db.query(ModerationAppeal).order_by(desc(ModerationAppeal.created_at)).all()
    return [
        ModerationAppealOut(
            id=a.id,
            user_id=a.user_id,
            username=a.user.username if a.user else "user",
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            reason=a.reason,
            status=a.status,
            moderator_notes=a.moderator_notes,
            created_at=a.created_at
        )
        for a in appeals
    ]

@router.post("/appeals/{appeal_id}/resolve")
def resolve_appeal(
    appeal_id: int,
    decision: str, # approve, reject
    notes: str = "",
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    appeal = db.query(ModerationAppeal).filter(ModerationAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found.")

    appeal.status = "approved" if decision == "approve" else "rejected"
    appeal.moderator_notes = notes
    appeal.resolved_by_id = current_user.id

    if decision == "approve" and appeal.entity_type == "post":
        post = db.query(Post).filter(Post.id == appeal.entity_id).first()
        if post:
            post.moderation_status = "approved"
            post.is_flagged = False
            post.flag_reason = None
            post.under_review_badge = False

    log = ModerationLog(
        moderator_id=current_user.id,
        entity_type="appeal",
        entity_id=appeal.id,
        action=decision,
        previous_state="pending",
        new_state=appeal.status,
        reason=notes or f"Appeal {appeal.status} by moderator."
    )
    db.add(log)
    create_notification(
        db, appeal.user_id, current_user.id, "moderation",
        f"Your appeal for {appeal.entity_type} #{appeal.entity_id} was {appeal.status}.",
        appeal.entity_type, appeal.entity_id
    )
    db.commit()
    return {"status": appeal.status}

@router.get("/flagged-comments")
def get_flagged_comments(
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).filter(Comment.is_flagged == True).order_by(desc(Comment.created_at)).all()
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "username": c.user.username if c.user else "user",
            "post_id": c.post_id,
            "reel_id": c.reel_id,
            "text": c.text,
            "created_at": c.created_at
        }
        for c in comments
    ]

@router.post("/comments/{comment_id}/action")
def moderate_comment(
    comment_id: int,
    action: str, # approve, remove
    current_user: User = Depends(require_moderator),
    db: Session = Depends(get_db)
):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found.")
    if action == "approve":
        c.is_flagged = False
    else:
        db.delete(c)
    db.add(ModerationLog(
        moderator_id=current_user.id,
        entity_type="comment",
        entity_id=comment_id,
        action=action,
        previous_state="flagged",
        new_state="approved" if action == "approve" else "removed",
        reason=f"Comment {action}d by moderator."
    ))
    db.commit()
    return {"message": f"Comment {action}d."}
