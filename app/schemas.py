from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str
    email: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    team_name: Optional[str] = None  # Existing team name or new team name to create/join
    idea_title: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Team Member Schemas
class TeamMemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role_in_team: str = "Member"
    phone: Optional[str] = None

class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    name: str
    email: Optional[str] = None
    role_in_team: str
    phone: Optional[str] = None
    added_at: datetime

    class Config:
        from_attributes = True

# Team Schemas
class TeamCreate(BaseModel):
    name: str
    idea_title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = "Incubated"

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    idea_title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None

class TeamResponse(BaseModel):
    id: int
    name: str
    idea_title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: str
    created_at: datetime
    members_count: int = 0
    members: List[TeamMemberResponse] = []

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceCreate(BaseModel):
    date: str  # YYYY-MM-DD
    status: str  # Present, Absent, Half Day, Working Remotely
    work_summary: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    team_id: int
    team_name: Optional[str] = None
    user_id: Optional[int] = None
    submitted_by_name: Optional[str] = None
    date: str
    status: str
    work_summary: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True

# Message Schemas
class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    team_id: int
    sender_id: Optional[int] = None
    sender_name: str
    sender_role: str
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Admin Settings Schemas
class AdminSettingUpdate(BaseModel):
    incubation_name: Optional[str] = None
    allowed_admin_emails: Optional[str] = None
    announcement: Optional[str] = None

class AdminSettingResponse(BaseModel):
    id: int
    incubation_name: str
    allowed_admin_emails: str
    announcement: str
    updated_at: datetime

    class Config:
        from_attributes = True

# Dashboard Overview
class AdminDashboardStats(BaseModel):
    total_teams: int
    total_users: int
    total_members: int
    today_attendance_count: int
    announcement: str
