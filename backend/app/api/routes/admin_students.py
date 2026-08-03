"""API endpoints for admin student operations."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.models.student import Student
from app.services.storage_service import storage_service

router = APIRouter(prefix="/students", tags=["Admin Students"])
logger = logging.getLogger(__name__)

@router.post("/{student_id}/photo")
async def upload_student_photo(
    student_id: str, 
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a photo for a student."""
    try:
        # Read file
        contents = await file.read()
        
        # Upload using storage service
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        image_url = await storage_service.upload_image(contents, prefix=f"student-{student_id}", ext=ext)
        
        # Update database
        student = await db.get(Student, student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
            
        student.photo_url = image_url
        await db.commit()
        
        return {"success": True, "photoUrl": image_url}
    except Exception as e:
        logger.error(f"Failed to upload photo: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")
