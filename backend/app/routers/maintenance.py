from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from ..auth import get_current_user
from ..database import get_connection
from ..models import UserRead, MaintenanceWindowCreateList, MaintenanceWindowRead

router = APIRouter(tags=["maintenance"])

@router.post("/maintenance", response_model=list[MaintenanceWindowRead], status_code=status.HTTP_201_CREATED)
async def create_maintenance_window(
    payload: MaintenanceWindowCreateList, 
    current_user: Annotated[UserRead, Depends(get_current_user)]
) -> list[MaintenanceWindowRead]:
    """Create a planned maintenance window for one or more monitors."""
    # Ensure user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can schedule maintenance.")
        
    created_windows = []
    try:
        async with get_connection() as conn:
            for url_id in payload.url_ids:
                row = await conn.fetchrow(
                    """
                    INSERT INTO maintenance_windows (url_id, title, message, starts_at, ends_at)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, url_id, title, message, starts_at, ends_at
                    """,
                    url_id,
                    payload.title,
                    payload.message,
                    payload.starts_at,
                    payload.ends_at
                )
                created_windows.append(MaintenanceWindowRead(**dict(row)))
                
        return created_windows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/maintenance", response_model=list[MaintenanceWindowRead])
async def get_maintenance_windows(
    current_user: Annotated[UserRead, Depends(get_current_user)]
) -> list[MaintenanceWindowRead]:
    """Get all maintenance windows."""
    try:
        async with get_connection() as conn:
            # We want all windows that haven't ended yet
            # or all windows generally? We probably want all active and future windows,
            # but for the global dashboard, maybe just all windows.
            rows = await conn.fetch(
                """
                SELECT id, url_id, title, message, starts_at, ends_at
                FROM maintenance_windows
                ORDER BY starts_at DESC
                """
            )
            return [MaintenanceWindowRead(**dict(row)) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/maintenance/{window_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_window(
    window_id: int,
    current_user: Annotated[UserRead, Depends(get_current_user)]
):
    """Delete a maintenance window."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete maintenance windows.")
        
    try:
        async with get_connection() as conn:
            result = await conn.execute(
                "DELETE FROM maintenance_windows WHERE id = $1",
                window_id
            )
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Maintenance window not found.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
