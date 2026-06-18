from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth import create_access_token, get_current_user, get_password_hash, verify_password
from app.database import get_connection
from app.models import Token, UserCreate, UserRead

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days for a SaaS

@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    async with get_connection() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", user.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password)
        row = await conn.fetchrow(
            """
            INSERT INTO users (full_name, email, hashed_password)
            VALUES ($1, $2, $3)
            RETURNING id, full_name, email, created_at
            """,
            user.full_name,
            user.email,
            hashed_password,
        )
        return UserRead(**dict(row))

@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    async with get_connection() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, hashed_password FROM users WHERE email = $1",
            form_data.username
        )
        if not user or not verify_password(form_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: Annotated[UserRead, Depends(get_current_user)]):
    return current_user
