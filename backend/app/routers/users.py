from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_admin
from app.database import get_connection
from app.models import AdminUserOverview, UserRead, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=list[AdminUserOverview])
async def list_users(current_user: Annotated[UserRead, Depends(require_admin)]) -> list[AdminUserOverview]:
    """Retrieve all users and their URL counts (Admins only)."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                users.id, users.full_name, users.email, users.role, users.created_at,
                COUNT(urls.id) as url_count
            FROM users
            LEFT JOIN urls ON users.id = urls.user_id
            GROUP BY users.id
            ORDER BY users.created_at DESC
            """
        )
        return [AdminUserOverview(**dict(row)) for row in rows]


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int, 
    payload: UserUpdate, 
    current_user: Annotated[UserRead, Depends(require_admin)]
) -> UserRead:
    """Update a user's details or role (Admins only)."""
    async with get_connection() as conn:
        existing = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        new_name = payload.full_name if payload.full_name else existing["full_name"]
        new_email = payload.email if payload.email else existing["email"]
        new_role = payload.role if payload.role else existing["role"]

        if new_role not in ("admin", "viewer"):
            raise HTTPException(status_code=400, detail="Invalid role")

        try:
            row = await conn.fetchrow(
                """
                UPDATE users
                SET full_name = $1, email = $2, role = $3
                WHERE id = $4
                RETURNING id, full_name, email, role, created_at
                """,
                new_name, new_email, new_role, user_id
            )
            return UserRead(**dict(row))
        except Exception as e:
            if "unique constraint" in str(e).lower():
                raise HTTPException(status_code=400, detail="Email already taken")
            raise HTTPException(status_code=500, detail="Database error")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, current_user: Annotated[UserRead, Depends(require_admin)]) -> None:
    """Delete a user and all their associated URLs (Admins only)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    async with get_connection() as conn:
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="User not found")
        return
