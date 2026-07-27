"""Application configuration loaded from environment variables."""

from pathlib import Path

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings


# Resolve paths relative to this file's location (backend/app/config.py)
_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Central configuration for the application."""

    # Application metadata
    app_name: str = "UG Research Discovery Platform"
    app_version: str = "0.2.0"
    api_prefix: str = "/api/v1"

    # Data paths (kept for the import script to locate papers.json)
    data_dir: str = str(_BACKEND_DIR.parent / "data")

    # Database — required for the application to start
    database_url: str

    # Pagination defaults
    default_page_size: int = 20
    max_page_size: int = 100

    # CORS origins allowed to call the API
    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance used across the application
settings = Settings()
