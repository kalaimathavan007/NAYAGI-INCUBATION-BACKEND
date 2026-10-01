from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app import models, schemas, mongo_dal
from app.auth import get_current_user

router = APIRouter(prefix="/api/team", tags=["User Team Portal"])

@router.get("/my-team")
def get_my_team(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not associated with any team yet. Please contact admin or update your profile."
        )

    team = mongo_dal.find_team_by_id(str(current_user.team_id))
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in MongoDB.")

    # Get team members
    members = mongo_dal.format_doc_list(
        list(mongo_dal.get_mongo_db().team_members.find({"team_id": str(current_user.team_id)}))
    )

    members_formatted = []
    for m in members:
        members_formatted.append({
            "id": m["id"],
            "team_id": str(current_user.team_id),
            "name": m["name"],
            "email": m.get("email"),
            "role_in_team": m.get("role_in_team", "Member"),
            "phone": m.get("phone"),
            "added_at": m.get("added_at") or "2025-02-23T00:00:00"
        })

    return {
        "id": team["id"],
        "name": team["name"],
        "idea_title": team.get("idea_title"),
        "description": team.get("description"),
        "domain": team.get("domain"),
        "status": team.get("status", "Incubated"),
        "created_at": team.get("created_at") or "2025-02-23T00:00:00",
        "members_count": len(members_formatted),
        "members": members_formatted
    }

@router.post("/members")
def add_my_team_member(
    member_in: schemas.TeamMemberCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    if not current_user.team_id:
        raise HTTPException(status_code=400, detail="You do not belong to a team.")

    new_member = mongo_dal.add_team_member_mongo({
        "team_id": str(current_user.team_id),
        "name": member_in.name,
        "email": member_in.email,
        "role_in_team": member_in.role_in_team,
        "phone": member_in.phone
    })

    return {
        "id": new_member["id"],
        "team_id": str(current_user.team_id),
        "name": new_member["name"],
        "email": new_member.get("email"),
        "role_in_team": new_member.get("role_in_team"),
        "phone": new_member.get("phone"),
        "added_at": new_member.get("added_at") or "2025-02-23T00:00:00"
    }

@router.delete("/members/{member_id}")
def delete_my_team_member(
    member_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    success = mongo_dal.delete_team_member_mongo(member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Team member not found in MongoDB.")

    return {"message": "Team member removed from MongoDB."}

# --- Daily Attendance Submission ---

@router.post("/attendance")
def submit_attendance(
    att_in: schemas.AttendanceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    if not current_user.team_id:
        raise HTTPException(status_code=400, detail="You must belong to a team to submit attendance.")

    rec = mongo_dal.submit_attendance_mongo({
        "team_id": str(current_user.team_id),
        "user_id": str(current_user.id),
        "submitted_by_name": current_user.full_name,
        "date": att_in.date,
        "status": att_in.status,
        "work_summary": att_in.work_summary
    })

    team_doc = mongo_dal.find_team_by_id(str(current_user.team_id))
    team_name = team_doc.get("name") if team_doc else "Team"

    return {
        "id": rec["id"],
        "team_id": rec.get("team_id"),
        "team_name": team_name,
        "user_id": rec.get("user_id"),
        "submitted_by_name": current_user.full_name,
        "date": rec.get("date"),
        "status": rec.get("status"),
        "work_summary": rec.get("work_summary"),
        "submitted_at": rec.get("submitted_at") or "2025-02-23T00:00:00"
    }

@router.get("/attendance")
def get_team_attendance_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    if not current_user.team_id:
        raise HTTPException(status_code=400, detail="You do not belong to a team.")

    records = mongo_dal.get_attendance_mongo(team_id=str(current_user.team_id))
    team_doc = mongo_dal.find_team_by_id(str(current_user.team_id))
    team_name = team_doc.get("name") if team_doc else "Team"

    result = []
    for r in records:
        result.append({
            "id": r["id"],
            "team_id": r.get("team_id"),
            "team_name": team_name,
            "user_id": r.get("user_id"),
            "submitted_by_name": r.get("submitted_by_name", "Team Member"),
            "date": r.get("date"),
            "status": r.get("status"),
            "work_summary": r.get("work_summary"),
            "submitted_at": r.get("submitted_at") or "2025-02-23T00:00:00"
        })
    return result
