from __future__ import annotations

import sys
from importlib.metadata import version

import resend

from app.core.config import settings


def main() -> int:
    api_key = settings.resend_api_key or ""
    if not api_key:
        print("RESEND_API_KEY is missing", file=sys.stderr)
        return 1
    if not settings.clinic_owner_email:
        print("CLINIC_OWNER_EMAIL is missing", file=sys.stderr)
        return 1

    resend.api_key = api_key
    payload = {
        "from": settings.email_from,
        "to": [settings.clinic_owner_email],
        "subject": "Resend Direct Test",
        "html": "<strong>Resend Direct Test</strong>",
    }

    print(
        {
            "python_version": sys.version.split()[0],
            "resend_version": version("resend"),
            "env_file_path": str(settings.env_file_path),
            "api_key_length": len(api_key),
            "api_key_prefix": api_key[:8],
            "api_key_suffix": api_key[-4:],
            "email_from": settings.email_from,
            "clinic_owner_email": settings.clinic_owner_email,
        },
        flush=True,
    )

    response = resend.Emails.send(payload)
    print(response)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
