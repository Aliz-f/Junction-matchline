"""Small logging helpers that prevent accidental credential disclosure."""

from __future__ import annotations

import logging


class SecretRedactionFilter(logging.Filter):
    """Redact known sensitive fields without ever inspecting request bodies."""

    sensitive_markers = ("password", "token", "authorization", "api_key", "cookie")

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage().lower()
        if any(marker in message for marker in self.sensitive_markers):
            record.msg = "[redacted sensitive log message]"
            record.args = ()
        return True
