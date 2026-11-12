from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Community, CommunityMember, Post
from app.schemas import CommunityCreate, CommunityOut, PostOut
from app.security import get_current_user
from app.services.feed_service import format_posts

router = APIRouter(prefix="/communities", tags=["Communities"])

@router.get("", response_model=List[CommunityOut])
def get_communities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List topic communities (e.g., /c/technology, /c/art, /c/learning, /c/sports)"""
    user_memberships = {
        m.community_id for m in db.query(CommunityMember).filter(CommunityMember.user_id == current_user.id).all()
    }
    communities = db.query(Community).all()

    result = []
    for c in communities:
        result.append(CommunityOut(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            rules=c.rules,
            icon_url=c.icon_url,
            interest_id=c.interest_id,
            interest_name=c.interest.name if c.interest else "General",
            member_count=c.member_count,
            is_child_safe=c.is_child_safe,
            is_member=c.id in user_memberships,
            created_at=c.created_at
        ))
    return result

@router.post("", response_model=CommunityOut)
def create_community(
    comm_in: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.account_type == "child":
        raise HTTPException(status_code=403, detail="Child accounts cannot create communities.")

    existing = db.query(Community).filter(
        (Community.slug == comm_in.slug) | (Community.name == comm_in.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A community with this name or slug already exists.")

    new_comm = Community(
        name=comm_in.name,
        slug=comm_in.slug.lower().replace(" ", "-"),
        description=comm_in.description,
        rules=comm_in.rules,
        interest_id=comm_in.interest_id,
        icon_url=comm_in.icon_url or "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200",
        created_by_id=current_user.id,
        member_count=1
    )
    db.add(new_comm)
    db.commit()
    db.refresh(new_comm)

    # Add creator as admin member
    membership = CommunityMember(community_id=new_comm.id, user_id=current_user.id, role="admin")
    db.add(membership)
    db.commit()

    return CommunityOut(
        id=new_comm.id,
        name=new_comm.name,
        slug=new_comm.slug,
        description=new_comm.description,
        rules=new_comm.rules,
        icon_url=new_comm.icon_url,
        interest_id=new_comm.interest_id,
        interest_name=new_comm.interest.name if new_comm.interest else "General",
        member_count=1,
        is_child_safe=new_comm.is_child_safe,
        is_member=True,
        created_at=new_comm.created_at
    )

@router.post("/{community_id}/join")
def join_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comm = db.query(Community).filter(Community.id == community_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Community not found.")

    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()

    if not existing:
        new_member = CommunityMember(community_id=community_id, user_id=current_user.id, role="member")
        db.add(new_member)
        comm.member_count += 1
        db.commit()

    return {"is_member": True, "member_count": comm.member_count}

@router.post("/{community_id}/leave")
def leave_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comm = db.query(Community).filter(Community.id == community_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Community not found.")

    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        comm.member_count = max(0, comm.member_count - 1)
        db.commit()

    return {"is_member": False, "member_count": comm.member_count}

@router.get("/{slug}/posts", response_model=List[PostOut])
def get_community_posts(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comm = db.query(Community).filter(Community.slug == slug).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Community not found.")

    posts = db.query(Post).filter(
        Post.community_id == comm.id,
        Post.moderation_status == "approved",
        Post.is_flagged == False
    ).order_by(desc(Post.created_at), desc(Post.id)).all()

    return format_posts(posts, current_user, f"Community: {comm.name}")
