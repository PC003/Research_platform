import logging
from typing import Any, Dict

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)

# Configure Cloudinary if credentials are provided
if all([settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret]):
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    logger.info("Cloudinary configured successfully.")
else:
    logger.warning("Cloudinary credentials are not fully set in the environment. Image uploads will fail.")


async def upload_image(file: UploadFile, folder: str = "research_platform") -> str:
    """
    Uploads an image file to Cloudinary and returns the secure URL.
    
    Args:
        file (UploadFile): The file uploaded from the FastAPI endpoint.
        folder (str): The folder in Cloudinary to store the image.
        
    Returns:
        str: The secure URL of the uploaded image.
        
    Raises:
        Exception: If the upload fails or credentials are not set.
    """
    if not all([settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret]):
        raise ValueError("Cloudinary credentials are not configured.")

    try:
        # We need to read the contents of the UploadFile to pass to cloudinary
        contents = await file.read()
        
        # Upload the file to Cloudinary
        response: Dict[str, Any] = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type="image",
        )
        
        # We should reset the file position in case the file needs to be read again
        await file.seek(0)
        
        # The 'secure_url' is the https link to the image
        secure_url = response.get("secure_url")
        if not secure_url:
            raise Exception("Cloudinary response did not contain a secure_url.")
            
        logger.info(f"Successfully uploaded image to Cloudinary: {secure_url}")
        return secure_url
        
    except Exception as e:
        logger.error(f"Failed to upload image to Cloudinary: {str(e)}")
        raise
