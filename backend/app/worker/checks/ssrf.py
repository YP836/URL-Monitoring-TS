import socket
import ipaddress
from urllib.parse import urlparse

class SSRFError(ValueError):
    pass

def _is_unsafe_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_reserved or
            ip.is_multicast or
            ip.is_unspecified
        )
    except ValueError:
        return False

def validate_public_url(url: str, resolve_dns: bool = True) -> None:
    """Raise SSRFError if url is not a safe public http(s) target.
    Block: non-http(s) schemes; host 'localhost'; IPs (or, if resolve_dns,
    ALL DNS-resolved IPs) that are loopback/private/link-local(incl.
    169.254.169.254)/reserved/multicast/unspecified(0.0.0.0,::).
    Use the stdlib `ipaddress` module (is_private/is_loopback/is_link_local/
    is_reserved/is_multicast/is_unspecified). With resolve_dns, resolve via
    socket.getaddrinfo and reject if ANY address is unsafe.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise SSRFError("Failed to parse URL")
        
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Unsupported scheme: {parsed.scheme}")
        
    hostname = parsed.hostname
    if not hostname:
        raise SSRFError("Missing hostname")
        
    if hostname.lower() == "localhost":
        raise SSRFError("Localhost is blocked")
        
    if resolve_dns:
        try:
            addrinfo = socket.getaddrinfo(hostname, None)
            for info in addrinfo:
                ip_str = info[4][0]
                if _is_unsafe_ip(ip_str):
                    raise SSRFError(f"Unsafe IP address resolved: {ip_str}")
        except socket.gaierror:
            raise SSRFError("DNS resolution failed")
    else:
        if _is_unsafe_ip(hostname):
            raise SSRFError(f"Unsafe IP address provided: {hostname}")
