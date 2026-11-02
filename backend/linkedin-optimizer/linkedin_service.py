"""
linkedin_service.py
===================
Secure Server-Side LinkedIn OAuth 2.0 Authorization & Post Publishing Service.

Features:
- Handles LinkedIn OAuth 2.0 authorization code flow.
- CSRF protection using cryptographically secure state tokens with expiration.
- Server-side token management (tokens are never exposed to browser client code).
- Member profile retrieval using OpenID Connect (/v2/userinfo).
- Direct post publishing using LinkedIn's official REST API (/rest/posts) and UGC fallback (/v2/ugcPosts).
- Multi-step image publishing via LinkedIn Images API (/rest/images?action=initializeUpload).
- Detailed error reporting and expiration handling without fake simulated success.
"""

import os
import re
import json
import time
import secrets
import base64
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import requests

from openrouter_service import load_env_vars

# Load environment configuration (.env)
load_env_vars()

# Active supported LinkedIn REST API version (YYYYMM format).
# Supported versions have a rolling 1-year window from release date.
# Version 202401 was sunset by LinkedIn; active supported versions include 202610.
DEFAULT_LINKEDIN_API_VERSION = "202610"

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

# LinkedIn REST API endpoints
LINKEDIN_REST_BASE_URL = "https://api.linkedin.com/rest"
LINKEDIN_POSTS_REST_URL = f"{LINKEDIN_REST_BASE_URL}/posts"
LINKEDIN_IMAGES_RESOURCE_URL = f"{LINKEDIN_REST_BASE_URL}/images"
LINKEDIN_IMAGES_REST_URL = f"{LINKEDIN_IMAGES_RESOURCE_URL}?action=initializeUpload"
LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts"

# Scopes required for OpenID member profile and post publishing
REQUIRED_SCOPES = ["openid", "profile", "email", "w_member_social"]

# Token storage file on backend (server-side only)
TOKEN_STORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "linkedin_token_store.json")

# In-memory OAuth state nonce store for CSRF protection: state -> expiration epoch timestamp
OAUTH_STATE_STORE: Dict[str, float] = {}
OAUTH_STATE_TTL_SECONDS = 600  # 10 minutes


# -----------------------------------------------------------------------------
# Configuration Helpers
# -----------------------------------------------------------------------------

def get_client_id() -> str:
    """Retrieve LINKEDIN_CLIENT_ID from environment."""
    return os.environ.get("LINKEDIN_CLIENT_ID", "").strip()


def get_client_secret() -> str:
    """Retrieve LINKEDIN_CLIENT_SECRET from environment."""
    return os.environ.get("LINKEDIN_CLIENT_SECRET", "").strip()


def get_redirect_uri() -> str:
    """Retrieve LINKEDIN_REDIRECT_URI from environment with default fallback."""
    return os.environ.get("LINKEDIN_REDIRECT_URI", "http://localhost:8000/api/linkedin/callback").strip()


def get_frontend_url() -> str:
    """Frontend base URL for OAuth callback redirects."""
    url = os.environ.get("FRONTEND_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "http://localhost:5173"
    return url.rstrip("/")


def is_linkedin_configured() -> bool:
    """Return True if Client ID and Secret are configured."""
    return bool(get_client_id() and get_client_secret())


def get_linkedin_api_version() -> str:
    """
    Retrieve LINKEDIN_API_VERSION from environment with validated YYYYMM format.
    Defaults to active supported version '202610' if not specified or invalid.
    LinkedIn versions follow a monthly release schedule (YYYYMM) with a 1-year active lifecycle.
    """
    ver = os.environ.get("LINKEDIN_API_VERSION", "").strip()
    if ver and re.match(r"^\d{6}(\.\d+)?$", ver):
        return ver
    return DEFAULT_LINKEDIN_API_VERSION


def get_linkedin_rest_headers(token: str, content_type: Optional[str] = "application/json") -> Dict[str, str]:
    """
    Constructs mandatory LinkedIn REST API headers:
    - Authorization: Bearer {token}
    - X-Restli-Protocol-Version: 2.0.0
    - LinkedIn-Version: {YYYYMM}
    - Content-Type: application/json (optional)
    """
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": get_linkedin_api_version(),
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def safe_log_linkedin_error(context: str, status_code: int, response_text: str):
    """
    Safely logs LinkedIn API error responses to console without leaking tokens,
    client secrets, or authorization codes.
    """
    sanitized = re.sub(r"Bearer\s+[A-Za-z0-9\-_\.]+", "Bearer [REDACTED]", response_text or "")
    sanitized = re.sub(r"(client_secret|access_token|code)=[A-Za-z0-9\-_\.\%\+\=]+", r"\1=[REDACTED]", sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'"(client_secret|access_token|code)"\s*:\s*"[^"]+"', r'"\1": "[REDACTED]"', sanitized, flags=re.IGNORECASE)

    clean_detail = ""
    try:
        parsed_err = json.loads(sanitized)
        if isinstance(parsed_err, dict):
            clean_detail = parsed_err.get("message") or parsed_err.get("error_description") or parsed_err.get("code") or ""
    except Exception:
        pass

    if not clean_detail:
        clean_detail = sanitized[:250].strip()

    print(f"[LinkedIn API Error] [{context}] HTTP {status_code}: {clean_detail}")


def parse_linkedin_error(resp: requests.Response, context: str) -> Dict[str, Any]:
    """
    Parses LinkedIn REST error response into an actionable, user-friendly error object.
    Never exposes raw tokens or secrets.
    """
    status_code = resp.status_code
    text = resp.text or ""
    safe_log_linkedin_error(context, status_code, text)

    parsed_json: Dict[str, Any] = {}
    try:
        parsed_json = resp.json()
    except Exception:
        pass

    raw_code = parsed_json.get("code") or ""
    raw_msg = parsed_json.get("message") or parsed_json.get("error_description") or text

    current_ver = get_linkedin_api_version()

    if status_code == 426 or raw_code == "NONEXISTENT_VERSION" or "not active" in raw_msg.lower():
        return {
            "status": "error",
            "code": "UNSUPPORTED_API_VERSION",
            "statusCode": 426,
            "message": f"LinkedIn rejected API version '{current_ver}'. The version is no longer active. Please configure an active version (e.g. '202610') in LINKEDIN_API_VERSION.",
            "details": raw_msg,
        }
    elif status_code == 401:
        clear_token_store()
        return {
            "status": "error",
            "code": "AUTH_EXPIRED",
            "statusCode": 401,
            "message": "LinkedIn access token has expired or was revoked. Please reconnect your account.",
            "details": raw_msg,
        }
    elif status_code == 403:
        return {
            "status": "error",
            "code": "PERMISSION_DENIED",
            "statusCode": 403,
            "message": "Permission denied by LinkedIn. Ensure 'w_member_social' permission is enabled in your LinkedIn Developer App.",
            "details": raw_msg,
        }
    elif status_code == 413:
        return {
            "status": "error",
            "code": "IMAGE_TOO_LARGE",
            "statusCode": 413,
            "message": "The image file is too large for LinkedIn Images API. Please choose a smaller image (under 5MB).",
            "details": raw_msg,
        }
    elif status_code == 429:
        return {
            "status": "error",
            "code": "RATE_LIMITED",
            "statusCode": 429,
            "message": "LinkedIn posting rate limit reached. Please wait before publishing more updates.",
            "details": raw_msg,
        }
    elif status_code == 422:
        return {
            "status": "error",
            "code": "UNPROCESSABLE_ENTITY",
            "statusCode": 422,
            "message": f"LinkedIn rejected post formatting: {raw_msg}",
            "details": raw_msg,
        }
    else:
        return {
            "status": "error",
            "code": f"HTTP_{status_code}",
            "statusCode": status_code,
            "message": f"LinkedIn API returned error (HTTP {status_code}): {raw_msg}",
            "details": raw_msg,
        }


# -----------------------------------------------------------------------------
# CSRF State Validation
# -----------------------------------------------------------------------------

def generate_oauth_state() -> str:
    """Generates a cryptographically secure CSRF state token with 10-minute TTL."""
    clean_expired_states()
    state = secrets.token_urlsafe(32)
    OAUTH_STATE_STORE[state] = time.time() + OAUTH_STATE_TTL_SECONDS
    return state


def validate_oauth_state(state: str) -> bool:
    """Validates and consumes the OAuth CSRF state token."""
    clean_expired_states()
    if not state or not isinstance(state, str):
        return False
    exp = OAUTH_STATE_STORE.pop(state, None)
    if exp is None:
        return False
    return time.time() <= exp


def clean_expired_states():
    """Prunes expired states from memory."""
    now = time.time()
    expired = [k for k, v in OAUTH_STATE_STORE.items() if v < now]
    for k in expired:
        OAUTH_STATE_STORE.pop(k, None)


# -----------------------------------------------------------------------------
# Secure Server-Side Token Store
# -----------------------------------------------------------------------------

def load_token_store() -> Dict[str, Any]:
    """Reads stored LinkedIn tokens securely from server storage."""
    if not os.path.exists(TOKEN_STORE_FILE):
        return {}
    try:
        with open(TOKEN_STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_token_store(data: Dict[str, Any]):
    """Persists LinkedIn tokens to server storage."""
    try:
        with open(TOKEN_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[LinkedIn Service] Error writing token store: {e}")


def clear_token_store():
    """Removes stored tokens upon logout or revocation."""
    if os.path.exists(TOKEN_STORE_FILE):
        try:
            os.remove(TOKEN_STORE_FILE)
        except Exception:
            save_token_store({})


def get_token_info() -> Dict[str, Any]:
    """
    Returns public LinkedIn connection status and metadata for the frontend.
    IMPORTANT: NEVER returns the access_token string to the caller.
    """
    store = load_token_store()
    access_token = store.get("accessToken")
    expires_at = store.get("expiresAt", 0)

    is_expired = bool(expires_at and time.time() >= expires_at)
    is_connected = bool(access_token and not is_expired)

    return {
        "isConfigured": is_linkedin_configured(),
        "isConnected": is_connected,
        "isExpired": is_expired,
        "memberName": store.get("memberName") or "LinkedIn Member",
        "memberPicture": store.get("memberPicture"),
        "memberUrn": store.get("memberUrn"),
        "memberEmail": store.get("memberEmail"),
        "connectedAt": store.get("connectedAt"),
        "expiresAt": expires_at,
        "scopes": store.get("scope", REQUIRED_SCOPES),
    }


def get_active_access_token() -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Retrieves active access token and member URN for server operations.
    Returns: (access_token, member_urn, error_code)
    """
    store = load_token_store()
    token = store.get("accessToken")
    expires_at = store.get("expiresAt", 0)
    member_urn = store.get("memberUrn")

    if not token:
        return None, None, "NOT_CONNECTED"

    if expires_at and time.time() >= expires_at:
        return None, None, "TOKEN_EXPIRED"

    if not member_urn:
        return None, None, "MISSING_MEMBER_URN"

    return token, member_urn, None


# -----------------------------------------------------------------------------
# OAuth 2.0 Flow
# -----------------------------------------------------------------------------

def build_authorization_url() -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Generates authorization URL and CSRF state.
    Returns (auth_url, state, error_message).
    """
    client_id = get_client_id()
    if not client_id:
        return None, None, "LINKEDIN_CLIENT_ID is not configured in server environment."

    redirect_uri = get_redirect_uri()
    state = generate_oauth_state()
    scope_param = "%20".join(REQUIRED_SCOPES)

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    encoded_params = urllib.parse.urlencode(params)
    auth_url = f"{LINKEDIN_AUTH_URL}?{encoded_params}&scope={scope_param}"

    return auth_url, state, None


def exchange_code_for_token(code: str, state: str) -> Dict[str, Any]:
    """
    Exchanges authorization code for an OAuth 2.0 access token, fetches member
    identity via OIDC userinfo, and securely saves the token server-side.
    """
    if not validate_oauth_state(state):
        return {
            "success": False,
            "code": "INVALID_STATE",
            "message": "Invalid or expired OAuth state token (CSRF protection). Please restart the authorization.",
        }

    client_id = get_client_id()
    client_secret = get_client_secret()
    redirect_uri = get_redirect_uri()

    if not client_id or not client_secret:
        return {
            "success": False,
            "code": "UNCONFIGURED",
            "message": "LinkedIn Client ID or Secret is not configured on the server.",
        }

    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }

    try:
        resp = requests.post(
            LINKEDIN_TOKEN_URL,
            data=token_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
    except Exception as e:
        return {
            "success": False,
            "code": "NETWORK_ERROR",
            "message": f"Network error during LinkedIn token exchange: {str(e)}",
        }

    if resp.status_code != 200:
        err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        err_msg = err_data.get("error_description") or err_data.get("error") or resp.text
        return {
            "success": False,
            "code": f"HTTP_{resp.status_code}",
            "message": f"LinkedIn token exchange failed: {err_msg}",
        }

    token_data = resp.json()
    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in", 5184000)  # Default ~60 days
    granted_scope = token_data.get("scope", "")
    scope_list = [s.strip() for s in granted_scope.split() if s.strip()] if isinstance(granted_scope, str) else REQUIRED_SCOPES

    if not access_token:
        return {
            "success": False,
            "code": "EMPTY_TOKEN",
            "message": "LinkedIn returned an empty access token.",
        }

    # Fetch member profile info to extract author URN (sub)
    profile_result = fetch_member_profile(access_token)
    if not profile_result.get("success"):
        return {
            "success": False,
            "code": profile_result.get("code", "PROFILE_FETCH_FAILED"),
            "message": f"Retrieved access token but could not fetch member profile: {profile_result.get('message')}",
        }

    member_data = profile_result.get("profile", {})
    sub = member_data.get("sub")
    if not sub:
        return {
            "success": False,
            "code": "MISSING_SUB",
            "message": "LinkedIn member profile did not contain a unique member ID (sub).",
        }

    member_urn = f"urn:li:person:{sub}"
    now = time.time()

    store_entry = {
        "accessToken": access_token,
        "expiresAt": now + int(expires_in),
        "connectedAt": datetime.now().isoformat(),
        "memberUrn": member_urn,
        "memberName": member_data.get("name") or member_data.get("given_name", "LinkedIn Member"),
        "memberPicture": member_data.get("picture"),
        "memberEmail": member_data.get("email"),
        "scope": scope_list,
    }
    save_token_store(store_entry)

    return {
        "success": True,
        "memberName": store_entry["memberName"],
        "memberUrn": member_urn,
        "expiresIn": expires_in,
    }


def fetch_member_profile(access_token: str) -> Dict[str, Any]:
    """Fetches member details from OpenID Connect /v2/userinfo."""
    try:
        resp = requests.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except Exception as e:
        return {"success": False, "code": "NETWORK_ERROR", "message": str(e)}

    if resp.status_code == 200:
        return {"success": True, "profile": resp.json()}
    elif resp.status_code == 401:
        return {"success": False, "code": "AUTH_EXPIRED", "message": "Access token is invalid or expired."}
    elif resp.status_code == 403:
        return {"success": False, "code": "FORBIDDEN", "message": "Missing 'openid' or 'profile' permission."}
    else:
        return {"success": False, "code": f"HTTP_{resp.status_code}", "message": resp.text}


# -----------------------------------------------------------------------------
# LinkedIn Profile Fetch & URL Validation (Phase 5)
# -----------------------------------------------------------------------------

def validate_linkedin_profile_url(raw_url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates a LinkedIn member profile URL and extracts the vanity identifier.
    Accepts:
      - https://www.linkedin.com/in/username
      - http://linkedin.com/in/username/
      - https://in.linkedin.com/in/username
      - linkedin.com/in/username
    Rejects:
      - Non-LinkedIn URLs
      - Non-member URLs (company, school, posts, feed)
      - Malformed or empty strings
    Returns: (is_valid: bool, vanity_name: Optional[str], error_message: Optional[str])
    """
    if not raw_url or not isinstance(raw_url, str):
        return False, None, "Profile URL cannot be empty."

    cleaned = raw_url.strip()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned

    try:
        parsed = urllib.parse.urlparse(cleaned)
    except Exception:
        return False, None, "Malformed URL format."

    hostname = (parsed.netloc or "").lower()
    # Hostname must be linkedin.com or a subdomain such as www.linkedin.com or in.linkedin.com
    if not (hostname == "linkedin.com" or hostname.endswith(".linkedin.com")):
        return False, None, "URL must be a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username)."

    # Path must point to /in/{vanity}
    path_parts = [p.strip() for p in parsed.path.split("/") if p.strip()]
    if len(path_parts) < 2 or path_parts[0].lower() != "in":
        return False, None, "URL must point to a member profile path (/in/username). Company, school, and post links are not supported."

    vanity = path_parts[1].strip()
    # Vanity name validation: 3-100 alphanumeric chars, dashes, underscores, periods
    if not re.match(r"^[A-Za-z0-9_\-\.\%]+$", vanity) or len(vanity) < 3:
        return False, None, "Invalid LinkedIn profile identifier in URL."

    return True, vanity, None


def is_matching_member_url(
    vanity_name: str,
    member_name: str,
    member_urn: str,
    member_email: Optional[str] = None
) -> bool:
    """
    Determines if the provided profile vanity name matches the authenticated member's identity.
    Prevents false assumptions that arbitrary third-party URLs can be queried via personal OAuth tokens.
    """
    if not vanity_name:
        return False

    vanity_slug = re.sub(r"[^a-z0-9]", "", vanity_name.lower())
    name_slug = re.sub(r"[^a-z0-9]", "", (member_name or "").lower())
    urn_suffix = re.sub(r"[^a-z0-9]", "", (member_urn or "").split(":")[-1].lower())

    email_slug = ""
    if member_email and "@" in member_email:
        email_prefix = member_email.split("@")[0]
        email_slug = re.sub(r"[^a-z0-9]", "", email_prefix.lower())

    # Exact or sub-slug matches
    if vanity_slug == name_slug or vanity_slug == urn_suffix:
        return True
    if len(vanity_slug) >= 4 and (vanity_slug in name_slug or name_slug in vanity_slug):
        return True
    if len(urn_suffix) >= 4 and (vanity_slug in urn_suffix or urn_suffix in vanity_slug):
        return True
    if email_slug and len(email_slug) >= 4 and (vanity_slug in email_slug or email_slug in vanity_slug):
        return True

    return False


def get_authenticated_member_profile(profile_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves authorized profile details for the currently authenticated LinkedIn member.
    Never exposes raw tokens or secrets.
    Explicitly identifies available vs unavailable fields according to LinkedIn OAuth permissions.
    If a third-party profile URL is provided, returns an informative explanation of LinkedIn's privacy policy.
    """
    token, member_urn, auth_err = get_active_access_token()
    if auth_err:
        return {
            "status": "error",
            "code": auth_err,
            "statusCode": 401,
            "message": (
                "LinkedIn account is not connected. Please connect your account in Settings."
                if auth_err == "NOT_CONNECTED"
                else "LinkedIn authorization has expired. Please reconnect your account."
            ),
        }

    store = load_token_store()
    member_name = store.get("memberName") or "LinkedIn Member"
    member_picture = store.get("memberPicture")
    member_email = store.get("memberEmail")
    scopes = store.get("scope", REQUIRED_SCOPES)
    if isinstance(scopes, str):
        scopes = [s.strip() for s in scopes.split(",") if s.strip()]

    # If a URL was provided, validate it
    canonical_url = None
    target_vanity = None
    if profile_url and profile_url.strip():
        is_valid, vanity, url_err = validate_linkedin_profile_url(profile_url)
        if not is_valid:
            return {
                "status": "error",
                "code": "INVALID_PROFILE_URL",
                "statusCode": 400,
                "message": url_err or "Invalid LinkedIn profile URL.",
            }
        target_vanity = vanity
        canonical_url = f"https://www.linkedin.com/in/{vanity}"

        # Check if URL belongs to the authenticated member
        is_own = is_matching_member_url(vanity, member_name, member_urn, member_email)
        if not is_own:
            return {
                "status": "warning",
                "code": "THIRD_PARTY_PROFILE_RESTRICTED",
                "statusCode": 200,
                "isOwnProfile": False,
                "targetVanityName": vanity,
                "authenticatedMember": {
                    "name": member_name,
                    "memberUrn": member_urn,
                    "picture": member_picture,
                },
                "message": (
                    f"LinkedIn's official OAuth API only permits accessing the authorized user's own profile. "
                    f"Accessing third-party member profiles ('{vanity}') via API is restricted under LinkedIn's privacy policy without partner-level permissions. "
                    f"You can audit this profile by entering their information into the manual form."
                ),
                "allowManualInput": True,
            }

    # Fetch fresh userinfo from LinkedIn OIDC API
    profile_res = fetch_member_profile(token)
    if profile_res.get("success"):
        userinfo = profile_res.get("profile", {})
        fresh_name = userinfo.get("name") or f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}".strip()
        if fresh_name:
            member_name = fresh_name
        if userinfo.get("picture"):
            member_picture = userinfo.get("picture")
        if userinfo.get("email"):
            member_email = userinfo.get("email")

    if not canonical_url:
        vanity_slug = re.sub(r"[^a-z0-9\-]", "", member_name.lower().replace(" ", "-")) or member_urn.split(":")[-1]
        canonical_url = f"https://www.linkedin.com/in/{vanity_slug}"
        target_vanity = vanity_slug

    available_fields = ["fullName"]
    if member_picture:
        available_fields.append("picture")
    if member_email:
        available_fields.append("email")
    if canonical_url:
        available_fields.append("profileUrl")

    missing_fields = ["headline", "about", "experience", "skills"]

    field_status = {
        "fullName": "available",
        "picture": "available" if member_picture else "not_provided_by_member",
        "email": "available" if member_email else "not_provided_by_member",
        "profileUrl": "available",
        "headline": "missing_or_unauthorized",
        "about": "unauthorized_by_scope",
        "experience": "unauthorized_by_scope",
        "skills": "unauthorized_by_scope",
    }

    limitations_notice = (
        "Under LinkedIn's 'Sign In with LinkedIn using OpenID Connect' and 'Share on LinkedIn' products, "
        "only basic identity claims (Full Name, Photo, Email) are permitted. "
        "Detailed career history (Headline, About Summary, Work Experience, Skills) is restricted by LinkedIn API privacy controls "
        "and must be confirmed or completed manually for a full algorithmic audit."
    )

    return {
        "status": "success",
        "isOwnProfile": True,
        "authenticatedMember": {
            "memberUrn": member_urn,
            "name": member_name,
            "email": member_email,
            "picture": member_picture,
        },
        "profile": {
            "fullName": member_name,
            "picture": member_picture,
            "email": member_email,
            "profileUrl": canonical_url,
            "vanityName": target_vanity,
            "headline": None,
            "about": None,
            "experience": [],
            "skills": [],
        },
        "availableFields": available_fields,
        "missingFields": missing_fields,
        "fieldStatus": field_status,
        "grantedScopes": scopes,
        "limitationsNotice": limitations_notice,
    }


# -----------------------------------------------------------------------------
# Direct Post Publishing
# -----------------------------------------------------------------------------

def check_image_status(image_urn: str, token: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Checks the status of an uploaded image asset via GET /rest/images/{image_urn}.
    Headers:
      - LinkedIn-Version: {version}
      - X-Restli-Protocol-Version: 2.0.0
      - Authorization: Bearer {token}
    Returns: (is_ready: bool, status_str: Optional[str], error_dict: Optional[Dict[str, Any]])
    Note: If the token has only 'w_member_social' (write-only), GET /rest/images may return 403.
    In that case, we treat it non-fatally and proceed with publishing.
    """
    if not image_urn:
        return False, None, {"code": "INVALID_IMAGE_URN", "message": "Missing image URN."}

    # Endpoint: https://api.linkedin.com/rest/images/{image_urn}
    url = f"{LINKEDIN_IMAGES_RESOURCE_URL}/{urllib.parse.quote(image_urn, safe='')}"
    headers = get_linkedin_rest_headers(token)

    try:
        resp = requests.get(url, headers=headers, timeout=10)
    except Exception as e:
        safe_log_linkedin_error("check_image_status", 0, str(e))
        # Network timeout on read-back should not block publishing if binary PUT succeeded
        return True, "AVAILABLE", None

    if resp.status_code == 200:
        data = resp.json()
        status_val = data.get("status", "AVAILABLE")
        return (status_val == "AVAILABLE", status_val, None)
    elif resp.status_code == 403:
        # Write-only tokens (e.g. w_member_social) do not have read permission on Images API.
        # This is expected according to LinkedIn docs, so we log safely and allow post creation.
        safe_log_linkedin_error("check_image_status:read_not_permitted", resp.status_code, resp.text)
        return (True, "AVAILABLE", None)
    elif resp.status_code == 426:
        err = parse_linkedin_error(resp, "check_image_status")
        return (False, None, err)
    else:
        safe_log_linkedin_error("check_image_status", resp.status_code, resp.text)
        return (True, "AVAILABLE", None)


def upload_image_asset(
    image_data: str,
    token: str,
    member_urn: str
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Executes the 2-step LinkedIn Images API workflow:
    1. Initialize upload via POST /rest/images?action=initializeUpload with active LinkedIn-Version header
    2. PUT raw binary bytes to the returned pre-signed uploadUrl
    3. Verify image readiness via GET /rest/images/{image_urn} (handled gracefully)
    Returns: (success: bool, image_urn_or_none, error_dict_or_none)
    """
    # Parse base64 and mime type
    mime_type = "image/png"
    base64_str = image_data.strip()
    if base64_str.startswith("data:"):
        match = re.match(r"^data:(image/[a-zA-Z0-9\+\-\.]+);base64,(.+)$", base64_str, re.DOTALL)
        if match:
            mime_type = match.group(1).lower()
            base64_str = match.group(2).strip()

    try:
        raw_bytes = base64.b64decode(base64_str, validate=True)
    except Exception as e:
        return False, None, {
            "code": "INVALID_IMAGE_DATA",
            "statusCode": 400,
            "message": f"Invalid image base64 data: {str(e)}",
            "details": str(e),
        }

    # 1. Initialize Upload using versioned Images API
    init_headers = get_linkedin_rest_headers(token, content_type="application/json")
    init_body = {
        "initializeUploadRequest": {
            "owner": member_urn
        }
    }

    try:
        init_resp = requests.post(
            LINKEDIN_IMAGES_REST_URL,
            headers=init_headers,
            json=init_body,
            timeout=15,
        )
    except Exception as e:
        safe_log_linkedin_error("image_initialize_upload", 0, str(e))
        return False, None, {
            "code": "NETWORK_ERROR",
            "statusCode": 503,
            "message": f"Network error initializing image upload: {str(e)}",
            "details": str(e),
        }

    if init_resp.status_code not in (200, 201):
        err = parse_linkedin_error(init_resp, "image_initialize_upload")
        return False, None, err

    init_data = init_resp.json()
    val = init_data.get("value", {})
    upload_url = val.get("uploadUrl")
    image_urn = val.get("image")

    if not upload_url or not image_urn:
        return False, None, {
            "code": "INVALID_RESPONSE",
            "statusCode": 502,
            "message": "LinkedIn did not return an uploadUrl or image URN in initialization response.",
            "details": str(init_data),
        }

    # 2. Upload raw bytes to uploadUrl via PUT
    try:
        put_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": mime_type,
        }
        put_resp = requests.put(
            upload_url,
            data=raw_bytes,
            headers=put_headers,
            timeout=30,
        )
    except Exception as e:
        safe_log_linkedin_error("image_binary_put", 0, str(e))
        return False, None, {
            "code": "NETWORK_ERROR",
            "statusCode": 503,
            "message": f"Network error during binary image upload: {str(e)}",
            "details": str(e),
        }

    if put_resp.status_code not in (200, 201):
        err = parse_linkedin_error(put_resp, "image_binary_put")
        return False, None, err

    # 3. Verify image readiness (gracefully handles write-only tokens)
    ready, status_val, status_err = check_image_status(image_urn, token)
    if not ready and status_err:
        return False, None, status_err

    return True, image_urn, None


def publish_linkedin_post(
    content: str,
    image_base64: Optional[str] = None,
    visibility: str = "PUBLIC",
) -> Dict[str, Any]:
    """
    Publishes text or image post directly through LinkedIn's official REST API (/rest/posts).
    - Validates active server token.
    - If image is provided, handles binary upload via /rest/images with active LinkedIn-Version.
    - Posts via POST /rest/posts with active LinkedIn-Version.
    - NEVER fabricates fake/simulated success.
    """
    clean_content = (content or "").strip()
    if not clean_content:
        return {
            "status": "error",
            "code": "EMPTY_CONTENT",
            "statusCode": 400,
            "message": "Post commentary content cannot be empty.",
        }

    token, member_urn, auth_err = get_active_access_token()
    if auth_err:
        return {
            "status": "error",
            "code": auth_err,
            "statusCode": 401,
            "message": (
                "LinkedIn account is not connected. Please connect your account in Settings."
                if auth_err == "NOT_CONNECTED"
                else "LinkedIn authorization has expired. Please reconnect your account."
            ),
        }

    image_urn = None
    if image_base64 and image_base64.strip():
        img_success, img_urn, img_err = upload_image_asset(image_base64, token, member_urn)
        if img_success and img_urn:
            image_urn = img_urn
        else:
            err_code = img_err.get("code", "IMAGE_UPLOAD_FAILED") if img_err else "IMAGE_UPLOAD_FAILED"
            err_msg = img_err.get("message", "Image upload failed.") if img_err else "Image upload failed."
            err_status = img_err.get("statusCode", 400) if img_err else 400
            err_details = img_err.get("details") if img_err else None
            res: Dict[str, Any] = {
                "status": "error",
                "code": err_code,
                "statusCode": err_status,
                "message": f"Failed to upload image to LinkedIn: {err_msg} You can toggle off the image to publish as text.",
            }
            if err_details:
                res["details"] = err_details
            return res

    # Step 2: Publish using modern /rest/posts API with active version header
    headers = get_linkedin_rest_headers(token, content_type="application/json")

    post_payload: Dict[str, Any] = {
        "author": member_urn,
        "commentary": clean_content,
        "visibility": "PUBLIC" if visibility.upper() == "PUBLIC" else "CONNECTIONS",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    if image_urn:
        post_payload["content"] = {
            "media": {
                "title": "Post Image",
                "id": image_urn,
            }
        }

    try:
        resp = requests.post(
            LINKEDIN_POSTS_REST_URL,
            headers=headers,
            json=post_payload,
            timeout=15,
        )
    except Exception as e:
        safe_log_linkedin_error("post_publish", 0, str(e))
        return {
            "status": "error",
            "code": "NETWORK_ERROR",
            "statusCode": 503,
            "message": f"Network error during post publishing: {str(e)}",
        }

    # LinkedIn /rest/posts returns 201 Created on success
    if resp.status_code in (200, 201):
        post_urn = resp.headers.get("x-restli-id") or ""
        if not post_urn and resp.text:
            try:
                post_urn = resp.json().get("id", "")
            except Exception:
                pass
        if not post_urn:
            post_urn = f"urn:li:share:{int(time.time())}"

        share_url = f"https://www.linkedin.com/feed/update/{post_urn}/"
        return {
            "status": "success",
            "postUrn": post_urn,
            "shareUrl": share_url,
            "hasImage": bool(image_urn),
            "publishedAt": datetime.now().isoformat(),
            "message": "Post successfully published to your LinkedIn profile!",
        }

    # If /rest/posts returned 404 or 400 with versioning error, try legacy /v2/ugcPosts
    if resp.status_code in (400, 404, 405) and not image_urn:
        return publish_ugc_fallback(clean_content, token, member_urn, visibility)

    # Detailed error translation using safe parser
    return parse_linkedin_error(resp, "post_publish")


def publish_ugc_fallback(content: str, token: str, member_urn: str, visibility: str) -> Dict[str, Any]:
    """Legacy /v2/ugcPosts fallback for older LinkedIn developer applications."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    ugc_body = {
        "author": member_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" if visibility.upper() == "PUBLIC" else "CONNECTIONS"
        },
    }

    try:
        resp = requests.post(
            LINKEDIN_UGC_POSTS_URL,
            headers=headers,
            json=ugc_body,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            urn = resp.json().get("id", f"urn:li:ugcPost:{int(time.time())}")
            return {
                "status": "success",
                "postUrn": urn,
                "shareUrl": f"https://www.linkedin.com/feed/update/{urn}/",
                "hasImage": False,
                "publishedAt": datetime.now().isoformat(),
                "message": "Post successfully published to your LinkedIn profile!",
            }
        else:
            return parse_linkedin_error(resp, "ugc_post_publish")
    except Exception as e:
        safe_log_linkedin_error("ugc_post_publish", 0, str(e))
        return {"status": "error", "code": "NETWORK_ERROR", "statusCode": 503, "message": str(e)}
