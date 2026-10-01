from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, DEFAULT_ADMIN_EMAILS
from app.database import get_db
from app import models, mongo_dal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_allowed_admin_email(email: str, db: Optional[Session] = None) -> bool:
    # First check MongoDB settings
    try:
        setting_m = mongo_dal.get_admin_settings_mongo()
        if setting_m and setting_m.get("allowed_admin_emails"):
            allowed_list = [e.strip().lower() for e in setting_m["allowed_admin_emails"].split(",") if e.strip()]
            if email.strip().lower() in allowed_list:
                return True
    except Exception:
        pass

    # Fallback to default list
    return email.strip().lower() in [e.lower() for e in DEFAULT_ADMIN_EMAILS]

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Try MongoDB first
    user_m = mongo_dal.find_user_by_email(email)
    if user_m:
        # Create a User model instance for interface compatibility
        u = models.User(
            id=user_m.get("id"),
            email=user_m["email"],
            full_name=user_m["full_name"],
            role=user_m["role"],
            team_id=user_m.get("team_id"),
            hashed_password=user_m["hashed_password"]
        )
        return u

    # Fallback to SQL DB
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)) -> models.User:
    if not is_allowed_admin_email(current_user.email, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Email '{current_user.email}' is not authorized to access the Admin Dashboard."
        )
    return current_user
