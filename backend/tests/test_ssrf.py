import pytest
from app.worker.checks.ssrf import validate_public_url, SSRFError

def test_ssrf_validate_public_url():
    # Safe URL
    validate_public_url("http://google.com")
    validate_public_url("https://example.com")
    
    # Block schemes
    with pytest.raises(SSRFError):
        validate_public_url("ftp://example.com")
    with pytest.raises(SSRFError):
        validate_public_url("file:///etc/passwd")
        
    # Block localhost
    with pytest.raises(SSRFError):
        validate_public_url("http://localhost:8000")
        
    # Block IP directly (no DNS)
    with pytest.raises(SSRFError):
        validate_public_url("http://127.0.0.1", resolve_dns=False)
    with pytest.raises(SSRFError):
        validate_public_url("http://169.254.169.254", resolve_dns=False)
    with pytest.raises(SSRFError):
        validate_public_url("http://10.0.0.1", resolve_dns=False)
        
    # Block via DNS
    # 127.0.0.1 typically resolves for localtest.me or similar, but we can mock
    # For now, just test invalid DNS
    with pytest.raises(SSRFError, match="DNS resolution failed"):
        validate_public_url("http://thisdomaindoesnotexist.invalid")
