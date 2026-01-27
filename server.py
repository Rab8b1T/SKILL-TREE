"""
Tiny local server for Skill Tree Dashboard.

- Serves static files from this folder (index.html, app.js, styles.css, etc.)
- Persists all progress into ONE real file: progress.json

Endpoints:
  GET  /progress  -> returns JSON from progress.json (creates it if missing)
  POST /progress  -> overwrites progress.json with provided JSON
"""

from __future__ import annotations

import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
PROGRESS_PATH = ROOT / "progress.json"
SEED_EXPORT_PATH = ROOT / "skilltree-progress-2025-11-26.json"

_lock = threading.Lock()


def _read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _atomic_write_json(path: Path, data: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def _ensure_progress_file() -> dict:
    """
    Ensure progress.json exists and return its contents.
    If missing, create it from the existing exported JSON (seed file).
    """
    if PROGRESS_PATH.exists():
        return _read_json(PROGRESS_PATH)

    if SEED_EXPORT_PATH.exists():
        seed = _read_json(SEED_EXPORT_PATH)
        # Normalize: make sure settings exist so front-end can persist them in same file.
        if "settings" not in seed or not isinstance(seed.get("settings"), dict):
            seed["settings"] = {"shortcutsEnabled": True, "view": "grid"}
        return seed

    # Minimal fallback if no seed exists.
    return {
        "version": "1.0",
        "zones": [],
        "user": {"current_xp": 0, "level": 1, "badges": [], "notes": {}, "journal": {}, "lastVisit": None, "streakDays": 0},
        "settings": {"shortcutsEnabled": True, "view": "grid"},
    }


class Handler(SimpleHTTPRequestHandler):
    # Keep logs readable
    def log_message(self, format: str, *args) -> None:  # noqa: A002
        super().log_message(format, *args)

    def end_headers(self) -> None:
        # Avoid stale JS/CSS during local development
        self.send_header("Cache-Control", "no-store")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, status: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/progress":
            with _lock:
                data = _ensure_progress_file()
                # Persist if we just generated from seed/minimal
                if not PROGRESS_PATH.exists():
                    _atomic_write_json(PROGRESS_PATH, data)
            self._send_json(200, data)
            return

        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/progress":
            self.send_error(404, "Not Found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        raw = self.rfile.read(length) if length > 0 else b""
        try:
            payload = json.loads(raw.decode("utf-8") if raw else "null")
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        if not isinstance(payload, dict) or "zones" not in payload or not isinstance(payload.get("zones"), list):
            self.send_error(400, "Invalid payload (expected object with zones: [])")
            return

        # Enforce single-file persistence: overwrite the file atomically.
        with _lock:
            _atomic_write_json(PROGRESS_PATH, payload)

        self._send_json(200, {"ok": True})


def main() -> None:
    os.chdir(ROOT)  # serve files from this folder
    host = "127.0.0.1"
    port = 8000
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}", flush=True)
    print("Progress file:", str(PROGRESS_PATH), flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()

