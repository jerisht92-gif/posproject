"""
WSGI entrypoint for production (gunicorn, uvicorn, Railway, Render, etc.).

Usage (from this directory):
  gunicorn wsgi:app
"""
from app import app

__all__ = ["app"]
