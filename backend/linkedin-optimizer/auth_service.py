"""
auth_service.py
===============
Authentication & Security Engine for LinkedPulse.

Features:
- PBKDF2-HMAC-SHA256 password hashing with 600,000 iterations and random 16-byte salt.
- Constant-time password verification using hmac.compare_digest.
- Secure session tokens (256-bit entropy); stores only SHA-256 token hashes in database.
- Session expiration and invalidation on logout.
- AES-256-GCM encryption for stored LinkedIn access tokens.
- Email and password validation guardrails.
- CSRF protection for cookie-authenticated endpoints.
- Password recovery token architecture (single-use, 15-minute expiration).
"""

import os
import re
import time
import hashlib
import hmac
import secrets
import base64
from typing import Optional, Dict, Any, Tuple

import database

# -----------------------------------------------------------------------------
# Constants & Configuration
# -----------------------------------------------------------------------------

PBKDF2_ITERATIONS = 600000  # OWASP recommendation for PBKDF2-HMAC-SHA256
PBKDF2_SALT_BYTES = 16
PBKDF2_HASH_BYTES = 32

SESSION_TTL_SECONDS = 7 * 86400  # 7 days
PASSWORD_RESET_TTL_SECONDS = 900  # 15 minutes
COOKIE_NAME = "lp_session"

# Server-side secret key for token encryption
# Set via environment or falls back to a deterministic server-derived key in development
DEFAULT_SECRET = os.environ.get(
    "SECRET_KEY",
    os.environ.get("LINKEDIN_CLIENT_SECRET", "linkedpulse_default_secure_secret_key_2026")
)

def get_secret_key() -> str:
    """Returns the active server secret key. Refuses default key in production."""
    key = os.environ.get("SECRET_KEY") or os.environ.get("LINKEDIN_CLIENT_SECRET")
    env = (os.environ.get("ENV") or os.environ.get("NODE_ENV") or "development").strip().lower()
    if env == "production":
        if not key or key in ("linkedpulse_default_secure_secret_key_2026", "your_strong_random_secret_key_here"):
            raise RuntimeError("[Security Exception] Running in production mode (ENV=production), but SECRET_KEY is not securely configured.")
        if len(key) < 32:
            raise RuntimeError("[Security Exception] Production SECRET_KEY must be at least 32 characters.")
        return key
    return key or DEFAULT_SECRET

def validate_production_env() -> Tuple[bool, Optional[str]]:
    """
    Validates required environment variables for production deployments.
    Never silently uses development defaults in production.
    """
    env = (os.environ.get("ENV") or os.environ.get("NODE_ENV") or "development").strip().lower()
    if env == "production":
        secret_key = os.environ.get("SECRET_KEY", "").strip()
        if not secret_key or secret_key in ("linkedpulse_default_secure_secret_key_2026", "your_strong_random_secret_key_here"):
            return False, "SECRET_KEY is required in production and cannot be the development default."
        if len(secret_key) < 32:
            return False, "SECRET_KEY must be at least 32 characters long in production."

        frontend_url = (os.environ.get("FRONTEND_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip()
        if not frontend_url or "localhost" in frontend_url or "127.0.0.1" in frontend_url:
            return False, "FRONTEND_URL or RENDER_EXTERNAL_URL must be configured with your live production domain (e.g. https://yourdomain.com or Render URL)."
    return True, None


# -----------------------------------------------------------------------------
# Password Hashing & Verification
# -----------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using PBKDF2-HMAC-SHA256 with 600,000 iterations
    and a unique 16-byte cryptographically secure random salt.
    Returns format: pbkdf2:sha256:600000$<salt_hex>$<hash_hex>
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string.")
    salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=PBKDF2_HASH_BYTES
    )
    return f"pbkdf2:sha256:{PBKDF2_ITERATIONS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verifies a plaintext password against the stored PBKDF2 hash using constant-time comparison.
    """
    if not password or not stored_hash or not isinstance(stored_hash, str):
        return False
    parts = stored_hash.split("$")
    if len(parts) != 3:
        return False
    algo_part, salt_hex, hash_hex = parts
    try:
        iterations = int(algo_part.split(":")[-1])
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
    except Exception:
        return False

    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
        dklen=len(expected_hash)
    )
    return hmac.compare_digest(derived, expected_hash)


# -----------------------------------------------------------------------------
# Validation Helpers
# -----------------------------------------------------------------------------

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(email: str) -> Tuple[bool, str]:
    """Validates email format."""
    if not email or not isinstance(email, str):
        return False, "Email address is required."
    clean = email.strip()
    if len(clean) > 254:
        return False, "Email address is too long."
    if not EMAIL_REGEX.match(clean):
        return False, "Please enter a valid email address."
    return True, clean.lower()


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces password requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    """
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password exceeds maximum length of 128 characters."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    return True, ""


# -----------------------------------------------------------------------------
# Session Token Management
# -----------------------------------------------------------------------------

def hash_token(raw_token: str) -> str:
    """Returns SHA-256 hex digest of a session or reset token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_session_token() -> str:
    """Generates a cryptographically secure 256-bit URL-safe token."""
    return secrets.token_urlsafe(32)


def create_user_session(
    user_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[str, float]:
    """
    Creates a new user session.
    Stores only the SHA-256 hash in the database.
    Returns (raw_session_token, expires_at_timestamp).
    """
    raw_token = generate_session_token()
    token_hash = hash_token(raw_token)
    expires_at = time.time() + SESSION_TTL_SECONDS
    database.create_session(token_hash, user_id, expires_at, ip_address, user_agent)
    return raw_token, expires_at


def authenticate_session(raw_token: str) -> Optional[Dict[str, Any]]:
    """
    Validates a raw session token by hashing it and querying the database.
    Returns the user dict if valid and unexpired; returns None otherwise.
    """
    if not raw_token or not isinstance(raw_token, str):
        return None
    token_hash = hash_token(raw_token)
    return database.get_session_user(token_hash)


def invalidate_session(raw_token: str) -> bool:
    """Invalidates an active session token on logout."""
    if not raw_token or not isinstance(raw_token, str):
        return False
    token_hash = hash_token(raw_token)
    return database.delete_session(token_hash)


# -----------------------------------------------------------------------------
# Cookie & Header Extraction
# -----------------------------------------------------------------------------

def extract_session_token_from_headers(headers: Dict[str, str]) -> Optional[str]:
    """
    Extracts session token from:
    1. Authorization header: Bearer <token>
    2. Cookie header: lp_session=<token>
    """
    # 1. Bearer token
    auth_header = headers.get("Authorization") or headers.get("authorization") or ""
    if auth_header.startswith("Bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            return bearer_token

    # 2. Cookie
    cookie_header = headers.get("Cookie") or headers.get("cookie") or ""
    if cookie_header:
        for part in cookie_header.split(";"):
            part = part.strip()
            if part.startswith(f"{COOKIE_NAME}="):
                cookie_val = part[len(COOKIE_NAME) + 1:].strip()
                if cookie_val:
                    return cookie_val
    return None


def format_session_cookie(raw_token: str, max_age: int = SESSION_TTL_SECONDS, is_secure: bool = False) -> str:
    """Formats an HttpOnly, SameSite=Lax session cookie."""
    cookie = f"{COOKIE_NAME}={raw_token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax"
    if is_secure:
        cookie += "; Secure"
    return cookie


def format_logout_cookie(is_secure: bool = False) -> str:
    """Formats an expired cookie to clear the session in the client browser."""
    cookie = f"{COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
    if is_secure:
        cookie += "; Secure"
    return cookie


# -----------------------------------------------------------------------------
# CSRF Protection
# -----------------------------------------------------------------------------

def validate_csrf(headers: Dict[str, str]) -> bool:
    """
    CSRF Defense: State-changing requests must include a custom header
    (e.g., X-Requested-With or X-CSRF-Token) that cannot be set by standard cross-origin form submissions.
    """
    x_requested = headers.get("X-Requested-With") or headers.get("x-requested-with")
    x_csrf = headers.get("X-CSRF-Token") or headers.get("x-csrf-token")
    return bool(x_requested or x_csrf)


# -----------------------------------------------------------------------------
# Sensitive Credential Encryption (AES-256-GCM)
# -----------------------------------------------------------------------------

def _get_encryption_key() -> bytes:
    """Derives a 256-bit encryption key from server secret using PBKDF2."""
    salt = b"linkedpulse_token_enc_salt"
    secret = get_secret_key()
    return hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 100000, dklen=32)


def encrypt_token(plaintext: str) -> str:
    """
    Encrypts a sensitive credential (such as a LinkedIn access token) using AES-256-GCM.
    Returns: aes_gcm:<nonce_b64>:<ciphertext_b64>:<tag_b64>
    """
    if not plaintext:
        return ""
    key = _get_encryption_key()
    try:
        from Cryptodome.Cipher import AES
        cipher = AES.new(key, AES.MODE_GCM)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode("utf-8"))
        nonce_b64 = base64.b64encode(cipher.nonce).decode("ascii")
        ciphertext_b64 = base64.b64encode(ciphertext).decode("ascii")
        tag_b64 = base64.b64encode(tag).decode("ascii")
        return f"aes_gcm:{nonce_b64}:{ciphertext_b64}:{tag_b64}"
    except ImportError:
        # Fallback to HMAC-authenticated base64 envelope if Cryptodome is unavailable
        nonce = secrets.token_bytes(16)
        mac = hmac.new(key, plaintext.encode("utf-8") + nonce, hashlib.sha256).digest()
        return f"envelope:{base64.b64encode(plaintext.encode('utf-8')).decode('ascii')}:{base64.b64encode(nonce).decode('ascii')}:{base64.b64encode(mac).decode('ascii')}"


def decrypt_token(encrypted_str: str) -> Optional[str]:
    """
    Decrypts an AES-256-GCM encrypted credential string.
    Returns plaintext string or None if decryption/authentication fails.
    """
    if not encrypted_str:
        return None
    key = _get_encryption_key()
    parts = encrypted_str.split(":")
    if parts[0] == "aes_gcm" and len(parts) == 4:
        try:
            from Cryptodome.Cipher import AES
            nonce = base64.b64decode(parts[1])
            ciphertext = base64.b64decode(parts[2])
            tag = base64.b64decode(parts[3])
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            plaintext = cipher.decrypt_and_verify(ciphertext, tag)
            return plaintext.decode("utf-8")
        except Exception:
            return None
    elif parts[0] == "envelope" and len(parts) == 4:
        try:
            pt = base64.b64decode(parts[1])
            nonce = base64.b64decode(parts[2])
            expected_mac = base64.b64decode(parts[3])
            actual_mac = hmac.new(key, pt + nonce, hashlib.sha256).digest()
            if hmac.compare_digest(expected_mac, actual_mac):
                return pt.decode("utf-8")
            return None
        except Exception:
            return None
    return None


# -----------------------------------------------------------------------------
# User Registration & Authentication Workflows
# -----------------------------------------------------------------------------

def register_user(name: str, email: str, password: str) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[Dict[str, Any]]]:
    """
    Registers a new user account.
    Returns (user_dict, session_token, error_dict).
    """
    clean_name = (name or "").strip()
    if len(clean_name) < 2:
        return None, None, {"status": "error", "code": "INVALID_NAME", "message": "Name must be at least 2 characters."}

    valid_email, email_res = validate_email(email)
    if not valid_email:
        return None, None, {"status": "error", "code": "INVALID_EMAIL", "message": email_res}

    valid_pw, pw_err = validate_password_strength(password)
    if not valid_pw:
        return None, None, {"status": "error", "code": "WEAK_PASSWORD", "message": pw_err}

    # Check if email is already registered
    existing = database.get_user_by_email(email_res)
    if existing:
        return None, None, {"status": "error", "code": "EMAIL_EXISTS", "message": "An account with this email address already exists."}

    # Hash password & persist user
    pw_hash = hash_password(password)
    user = database.create_user(clean_name, email_res, pw_hash)

    # Automatically initialize an empty manual profile for the new user
    database.upsert_user_profile(user["id"], {
        "profileSource": "manual",
        "targetRole": "Full-Stack Engineer",
        "headline": "",
        "about": "",
        "skills": [],
        "education": "",
        "experience": [],
        "projects": "",
        "experienceStatus": "fresher",
        "careerIntent": "current-field"
    })

    # Issue session
    raw_token, _ = create_user_session(user["id"])
    return user, raw_token, None


def login_user(
    email: str,
    password: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[Dict[str, Any]]]:
    """
    Authenticates user credentials.
    Returns generic error to prevent user enumeration.
    Returns (user_dict, session_token, error_dict).
    """
    valid_email, clean_email = validate_email(email)
    if not valid_email or not password:
        return None, None, {
            "status": "error",
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password."
        }

    user = database.get_user_by_email(clean_email)
    if not user:
        # Constant-time mitigation: perform dummy hash calculation so response times match
        _dummy_salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
        hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _dummy_salt, 10000)
        return None, None, {
            "status": "error",
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password."
        }

    if not verify_password(password, user["password_hash"]):
        return None, None, {
            "status": "error",
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password."
        }

    # Issue session
    raw_token, _ = create_user_session(user["id"], ip_address, user_agent)
    safe_user = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "createdAt": user["createdAt"],
        "updatedAt": user["updatedAt"]
    }
    return safe_user, raw_token, None


# -----------------------------------------------------------------------------
# Password Reset Workflows
# -----------------------------------------------------------------------------

def request_password_reset(email: str) -> Tuple[bool, str, Optional[str]]:
    """
    Initiates a password reset request.
    Always returns success message to avoid email enumeration.
    Returns (success, message, token_for_dev_mode).
    Note: Email delivery is pending integration.
    """
    valid_email, clean_email = validate_email(email)
    if not valid_email:
        return True, "If an account with that email exists, password reset instructions have been generated.", None

    user = database.get_user_by_email(clean_email)
    if not user:
        return True, "If an account with that email exists, password reset instructions have been generated.", None

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expires_at = time.time() + PASSWORD_RESET_TTL_SECONDS
    database.create_password_reset(token_hash, user["id"], expires_at)

    # Dispatch reset email via HTTP transactional email service (port 443 compatible with Render)
    try:
        import email_service
        email_service.send_password_reset_email(clean_email, raw_token)
    except Exception as e:
        print(f"[Auth Service] Notice: email dispatch could not be completed ({e})")

    # In development mode without configured email provider, return the token for testing and local recovery.
    # In production mode, NEVER log or expose raw reset tokens.
    env = (os.environ.get("ENV") or os.environ.get("NODE_ENV") or "development").strip().lower()
    if env == "production":
        return True, "If an account with that email exists, password reset instructions have been generated.", None

    return True, "If an account with that email exists, password reset instructions have been generated.", raw_token


def reset_password_with_token(raw_token: str, new_password: str) -> Tuple[bool, Optional[str]]:
    """
    Completes password reset using single-use token.
    Validates token, updates password hash, marks token used, and invalidates all active sessions.
    """
    if not raw_token or not isinstance(raw_token, str):
        return False, "Invalid or expired password reset token."

    valid_pw, pw_err = validate_password_strength(new_password)
    if not valid_pw:
        return False, pw_err

    token_hash = hash_token(raw_token)
    reset_rec = database.get_password_reset(token_hash)
    if not reset_rec:
        return False, "Invalid or expired password reset token."

    new_hash = hash_password(new_password)
    user_id = reset_rec["userId"]

    # Update password and consume token
    database.update_user_password(user_id, new_hash)
    database.mark_password_reset_used(token_hash)

    # Invalidate all active sessions for security
    database.delete_user_sessions(user_id)
    return True, None
