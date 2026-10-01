from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app import models, schemas, mongo_dal
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, is_allowed_admin_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.Token)
def register_user(user_in: schemas.UserRegister, db: Session = Depends(get_db)) -> Any:
    # Check if user exists in MongoDB
    existing_user_m = mongo_dal.find_user_by_email(user_in.email)
    if existing_user_m:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email address already exists in MongoDB."
        )

    # Determine role based on authorized admin emails configuration
    is_admin = is_allowed_admin_email(user_in.email, db)
    role = "admin" if is_admin else "user"

    # Handle team creation/association in MongoDB
    team_id_str = None
    team_name_str = None

    if user_in.team_name and user_in.team_name.strip():
        team_name_clean = user_in.team_name.strip()
        team_m = mongo_dal.find_team_by_name(team_name_clean)

        if not team_m:
            # Create a new team in MongoDB with full startup details
            team_m = mongo_dal.create_team_mongo({
                "name": team_name_clean,
                "idea_title": user_in.idea_title or f"{team_name_clean} Project",
                "description": user_in.description or "Incubated startup team",
                "domain": user_in.domain or "General Software",
                "status": "Incubated"
            })
            team_id_str = team_m["id"]
            team_name_str = team_m["name"]

            # Auto-add user as team lead member in MongoDB
            mongo_dal.add_team_member_mongo({
                "team_id": team_id_str,
                "name": user_in.full_name,
                "email": user_in.email,
                "role_in_team": "Team Lead",
                "phone": ""
            })
        else:
            team_id_str = team_m["id"]
            team_name_str = team_m["name"]

            # Update team details if provided
            update_fields = {}
            if user_in.idea_title: update_fields["idea_title"] = user_in.idea_title
            if user_in.domain: update_fields["domain"] = user_in.domain
            if user_in.description: update_fields["description"] = user_in.description
            if update_fields:
                mongo_dal.update_team_mongo(team_id_str, update_fields)

    # Create User in MongoDB
    new_user_data = {
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "role": role,
        "team_id": team_id_str
    }
    created_user = mongo_dal.create_user(new_user_data)

    # Generate JWT token
    access_token = create_access_token(data={"sub": created_user["email"], "role": role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user_id": 1,  # Numeric ID placeholder for interface compatibility
        "full_name": created_user["full_name"],
        "email": created_user["email"],
        "team_id": 1 if team_id_str else None,
        "team_name": team_name_str
    }

@router.post("/login", response_model=schemas.Token)
def login_user(user_in: schemas.UserLogin, db: Session = Depends(get_db)) -> Any:
    # 1. Search in MongoDB
    user_m = mongo_dal.find_user_by_email(user_in.email)
    if user_m and verify_password(user_in.password, user_m["hashed_password"]):
        # Update admin role if whitelisted
        role = "admin" if is_allowed_admin_email(user_m["email"]) else "user"
        mongo_dal.update_user_role(user_m["email"], role)

        team_name = None
        if user_m.get("team_id"):
            team_doc = mongo_dal.find_team_by_id(user_m["team_id"])
            if team_doc:
                team_name = team_doc.get("name")

        access_token = create_access_token(data={"sub": user_m["email"], "role": role})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": role,
            "user_id": 1,
            "full_name": user_m["full_name"],
            "email": user_m["email"],
            "team_id": 1 if user_m.get("team_id") else None,
            "team_name": team_name
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password."
    )

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)) -> Any:
    team_name = None
    if current_user.team_id:
        team_doc = mongo_dal.find_team_by_id(str(current_user.team_id))
        if team_doc:
            team_name = team_doc.get("name")

    return {
        "id": 1,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "team_id": current_user.team_id,
        "team_name": team_name,
        "created_at": current_user.created_at or "2025-02-23T00:00:00"
    }
