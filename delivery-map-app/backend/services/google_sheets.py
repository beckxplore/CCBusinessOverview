"""Utility helpers for fetching data from Google Sheets with simple caching."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import gspread
from google.auth.exceptions import GoogleAuthError
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


class GoogleSheetsNotConfigured(Exception):
    """Raised when Google Sheets credentials are missing."""


@dataclass
class CacheEntry:
    timestamp: float
    data: Any


class GoogleSheetsClient:
    """Singleton wrapper around gspread client with TTL-based caching."""

    _instance: Optional["GoogleSheetsClient"] = None
    _lock = threading.Lock()

    def __init__(self, credentials: Credentials, cache_ttl_seconds: int = 600) -> None:
        self._credentials = credentials
        self._client = gspread.authorize(credentials)
        self._cache_ttl = cache_ttl_seconds
        self._cache: Dict[str, CacheEntry] = {}

    @classmethod
    def get_instance(cls) -> "GoogleSheetsClient":
        with cls._lock:
            if cls._instance is None:
                credentials = cls._load_credentials()
                cache_ttl = int(os.getenv("GOOGLE_SHEETS_CACHE_TTL", "600"))
                cls._instance = cls(credentials=credentials, cache_ttl_seconds=cache_ttl)
            return cls._instance

    @staticmethod
    def _load_credentials() -> Credentials:
        info_env = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        file_env = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")

        if info_env:
            try:
                info = json.loads(info_env)
            except json.JSONDecodeError as exc:
                raise GoogleAuthError("Invalid JSON provided in GOOGLE_SERVICE_ACCOUNT_JSON") from exc
            return Credentials.from_service_account_info(info, scopes=SCOPES)

        if file_env:
            if not os.path.exists(file_env):
                raise GoogleAuthError(f"Service account file not found at {file_env}")
            return Credentials.from_service_account_file(file_env, scopes=SCOPES)

        raise GoogleSheetsNotConfigured(
            "Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE."
        )

    def _get_cache(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            return None
        if time.time() - entry.timestamp > self._cache_ttl:
            self._cache.pop(key, None)
            return None
        return entry.data

    def _set_cache(self, key: str, data: Any) -> None:
        self._cache[key] = CacheEntry(timestamp=time.time(), data=data)

    def get_records(self, sheet_id: str, worksheet: str) -> List[Dict[str, Any]]:
        """Return sheet data as list of dicts using the first row as headers."""
        cache_key = f"records:{sheet_id}:{worksheet}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        try:
            spreadsheet = self._client.open_by_key(sheet_id)
            ws = spreadsheet.worksheet(worksheet)
            records = ws.get_all_records(empty2zero=False, head=1)
            self._set_cache(cache_key, records)
            return records
        except gspread.SpreadsheetNotFound as exc:
            logger.error("Google Sheet not found: %s", sheet_id)
            raise
        except gspread.WorksheetNotFound as exc:
            logger.error("Worksheet '%s' not found in sheet %s", worksheet, sheet_id)
            raise

    def get_values(self, sheet_id: str, range_name: str) -> List[List[Any]]:
        """Return raw values for a given A1 range."""
        cache_key = f"values:{sheet_id}:{range_name}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        spreadsheet = self._client.open_by_key(sheet_id)
        result = spreadsheet.values_get(range_name)
        values = result.get("values", [])
        self._set_cache(cache_key, values)
        return values


def is_configured() -> bool:
    """Return True if Google Sheets credentials are available."""
    return bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE"))


def clear_cache() -> None:
    """Utility to clear cached sheet data (mainly for testing)."""
    if GoogleSheetsClient._instance:
        GoogleSheetsClient._instance._cache.clear()

