from fastapi import APIRouter

router = APIRouter()

# CRUD routes will be added in Phase 2


@router.get("/urls")
async def list_urls() -> list:
    """Placeholder endpoint returning an empty list."""
    return []
