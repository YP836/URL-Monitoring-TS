import re

with open('C:/Users/service.self/Projects/Url_Monitoring/backend/app/routers/urls.py', 'r') as f:
    content = f.read()

# Add imports
if 'from ..auth import get_current_user' not in content:
    content = content.replace('from fastapi import APIRouter, HTTPException, status', 
                              'from fastapi import APIRouter, Depends, HTTPException, status\nfrom typing import Annotated\nfrom ..auth import get_current_user\nfrom ..models import UserRead')

# Replace function signatures and SQL queries
content = re.sub(
    r'async def list_urls\(\) -> list\[URLRead\]:',
    r'async def list_urls(current_user: Annotated[UserRead, Depends(get_current_user)]) -> list[URLRead]:',
    content
)
content = content.replace('FROM urls\n                ORDER BY', 'FROM urls WHERE user_id = $1\n                ORDER BY')
content = content.replace('            )\n            return [URLRead', '            , current_user.id)\n            return [URLRead')

content = re.sub(
    r'async def create_url\(payload: URLCreate\) -> URLRead:',
    r'async def create_url(payload: URLCreate, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLRead:',
    content
)
content = content.replace('SELECT id FROM urls WHERE web_address = $1', 'SELECT id FROM urls WHERE web_address = $1 AND user_id = $2')
content = content.replace('web_address,\n            )', 'web_address, current_user.id\n            )')
content = content.replace('(web_address, name,', '(user_id, web_address, name,')
content = content.replace('VALUES ($1, $2, \'PENDING\', NOW(), $3, $4, $5, $6)', 'VALUES ($1, $2, $3, \'PENDING\', NOW(), $4, $5, $6, $7)')
content = content.replace('web_address,\n                payload.name,', 'current_user.id,\n                web_address,\n                payload.name,')


content = re.sub(
    r'async def get_url_detail\(url_id: int\) -> URLDetail:',
    r'async def get_url_detail(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLDetail:',
    content
)
content = content.replace('WHERE id = $1\n                """,\n                url_id,', 'WHERE id = $1 AND user_id = $2\n                """,\n                url_id,\n                current_user.id,')


content = re.sub(
    r'async def get_url_extra_data\(url_id: int\) -> URLExtraData:',
    r'async def get_url_extra_data(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLExtraData:',
    content
)
content = content.replace('SELECT check_type FROM urls WHERE id = $1', 'SELECT check_type FROM urls WHERE id = $1 AND user_id = $2')
content = content.replace('url_id)', 'url_id, current_user.id)')


content = re.sub(
    r'async def update_url\(url_id: int, payload: URLUpdate\) -> URLRead:',
    r'async def update_url(url_id: int, payload: URLUpdate, current_user: Annotated[UserRead, Depends(get_current_user)]) -> URLRead:',
    content
)
content = content.replace('SELECT * FROM urls WHERE id = $1', 'SELECT * FROM urls WHERE id = $1 AND user_id = $2')
content = content.replace('url_id)', 'url_id, current_user.id)')
content = content.replace('WHERE id = $4', 'WHERE id = $4 AND user_id = $5')
content = content.replace('url_id,\n            )', 'url_id,\n                current_user.id,\n            )')


content = re.sub(
    r'async def delete_url\(url_id: int\) -> None:',
    r'async def delete_url(url_id: int, current_user: Annotated[UserRead, Depends(get_current_user)]) -> None:',
    content
)
content = content.replace('DELETE FROM urls WHERE id = $1', 'DELETE FROM urls WHERE id = $1 AND user_id = $2')
content = content.replace('url_id)', 'url_id, current_user.id)')

with open('C:/Users/service.self/Projects/Url_Monitoring/backend/app/routers/urls.py', 'w') as f:
    f.write(content)
