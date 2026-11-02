"""
email_service.py
================
Zero-cost transactional email service for LinkedPulse on Render Free Web Service.

Background:
Render Free Web Services block outbound SMTP ports (25, 465, 587) to prevent spam.
Direct SMTP libraries (smtplib) fail with connection timeouts on Render free tier.
However, outbound HTTPS port 443 is unrestricted.

Solution:
This service uses HTTP-based transactional email APIs (e.g. Resend free tier:
3,000 emails/month free, zero cost, no credit card required) over HTTPS port 443.
Uses Python's standard library `urllib.request` — zero external dependencies.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Tuple, Optional


def get_frontend_url() -> str:
    """Returns the configured frontend URL for password reset links."""
    return os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def send_password_reset_email(to_email: str, reset_token: str) -> Tuple[bool, Optional[str]]:
    """
    Sends a password reset email using Resend HTTP API over port 443.
    Returns (success, error_or_message).
    """
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    env = (os.environ.get("ENV") or os.environ.get("NODE_ENV") or "development").strip().lower()
    frontend_url = get_frontend_url()
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    if not resend_api_key:
        if env == "production":
            print(f"[Email Service] RESEND_API_KEY not configured. Password reset link generated for {to_email} but not dispatched.")
        else:
            print(f"[Email Service] RESEND_API_KEY not configured. Local dev reset link: {reset_link}")
        return False, "EMAIL_SERVICE_NOT_CONFIGURED"

    from_email = os.environ.get("EMAIL_FROM", "LinkedPulse <onboarding@resend.dev>").strip()

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": "Reset your LinkedPulse password",
        "html": f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your LinkedPulse Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; text-align: left;">
          <tr>
            <td>
              <h2 style="color: #0284c7; margin-top: 0; font-size: 24px;">LinkedPulse</h2>
              <h3 style="color: #111827; margin-top: 0;">Password Reset Request</h3>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                We received a request to reset the password for your LinkedPulse account. Click the button below to choose a new password:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_link}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                LinkedPulse &mdash; AI-Powered LinkedIn Profile & Content Optimizer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "LinkedPulse/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            resp_body = resp.read().decode("utf-8")
            res_data = json.loads(resp_body)
            print(f"[Email Service] Password reset email dispatched via Resend to {to_email}. ID: {res_data.get('id')}")
            return True, None
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        print(f"[Email Service Error] Resend API HTTP {e.code}: {err_msg}")
        return False, f"Resend API error: {e.code}"
    except Exception as e:
        print(f"[Email Service Error] Failed to send email: {e}")
        return False, str(e)
