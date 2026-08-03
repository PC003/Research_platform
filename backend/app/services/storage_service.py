"""Storage Service.

Provides an abstract interface for storing files.
Currently implemented with local file storage to `backend/public`.
"""

import os
import uuid
from pathlib import Path

# The base directory where files will be stored locally.
# Resolves to backend/public/generated-images
BASE_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "generated-images"

# The base URL where these files are served from FastAPI
# We will mount /public to backend/public in main.py
BASE_URL_PATH = "/public/generated-images"

class StorageService:
    def __init__(self):
        # Ensure the storage directory exists
        os.makedirs(BASE_STORAGE_DIR, exist_ok=True)

    async def upload_image(self, image_bytes: bytes, prefix: str = "image", ext: str = "png") -> str:
        """Saves image bytes locally and returns the public URL.

        Args:
            image_bytes: The raw image file bytes.
            prefix: Prefix for the filename (e.g. 'analytics', 'student-poster').
            ext: File extension (e.g. 'png', 'jpg').

        Returns:
            The public URL to access the image.
        """
        filename = f"{prefix}-{uuid.uuid4().hex[:8]}.{ext}"
        file_path = BASE_STORAGE_DIR / filename
        
        # In a real async environment, file I/O should be non-blocking.
        # But for this simple implementation, standard I/O is fine.
        with open(file_path, "wb") as f:
            f.write(image_bytes)

        # Return the relative URL. The frontend can prepend the API base URL if needed.
        return f"{BASE_URL_PATH}/{filename}"

# Singleton instance
storage_service = StorageService()
