"""API endpoints for generating posters and analytics images."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
import logging

from app.core.database import get_db
from app.models.paper_orm import PaperORM
from app.models.student import Student
from app.models.generated_images import GeneratedImage
from app.services.image_service import image_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/images", tags=["Image Generation"])
logger = logging.getLogger(__name__)

class AnalyticsSummaryRequest(BaseModel):
    month: str
    year: int
    format: str = "png"

class StudentRecognitionRequest(BaseModel):
    month: str
    year: int
    achievementType: str
    studentIds: list[str]
    format: str = "png"

@router.post("/analytics-summary")
async def generate_analytics_summary(req: AnalyticsSummaryRequest, db: AsyncSession = Depends(get_db)):
    """Generate the analytics summary dashboard."""
    try:
        # NOTE: For a real production app, we would filter by month/year.
        # Since we just generated random mock data spanning 2020-2026, 
        # we'll pull global stats for demonstration, or attempt to filter by year.
        
        # Simple stats
        total_pubs = await db.scalar(select(func.count(PaperORM.id)))
        total_students = await db.scalar(select(func.count(distinct(PaperORM.student_id))))
        
        # We don't have real journal/conference type in DB right now, mock for demo
        # (Assuming paper schema doesn't have paper_type right now, we'll fake the split)
        j_count = int(total_pubs * 0.6)
        c_count = int(total_pubs * 0.3)
        b_count = total_pubs - j_count - c_count
        
        # Mock schools
        schools = ["SCOPE", "SENSE", "SELECT", "SMEC"]
        
        data = {
            "month": req.month,
            "year": req.year,
            "total_publications": total_pubs or 0,
            "total_students": total_students or 0,
            "avg_impact_factor": "3.5",
            "max_impact_factor": "12.4",
            "journal_count": j_count,
            "conference_count": c_count,
            "book_chapter_count": b_count,
            "q1_count": int(j_count * 0.2),
            "q2_count": int(j_count * 0.3),
            "q3_count": int(j_count * 0.4),
            "q4_count": int(j_count * 0.1),
            "school_labels": schools,
            "school_pubs": [int(total_pubs * 0.4), int(total_pubs * 0.3), int(total_pubs * 0.2), int(total_pubs * 0.1)],
            "school_students": [int(total_students * 0.4), int(total_students * 0.3), int(total_students * 0.2), int(total_students * 0.1)]
        }
        
        image_bytes = await image_service.generate_analytics_image(data)
        image_url = await storage_service.upload_image(image_bytes, prefix=f"analytics-{req.month.lower()}-{req.year}")
        
        # Save to history
        record = GeneratedImage(
            type="analytics",
            month=req.month,
            year=req.year,
            image_url=image_url
        )
        db.add(record)
        await db.commit()
        
        return {"success": True, "imageUrl": image_url}
    except Exception as e:
        logger.error(f"Failed to generate analytics image: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate image")

@router.post("/student-recognition")
async def generate_student_recognition(req: StudentRecognitionRequest, db: AsyncSession = Depends(get_db)):
    """Generate the student recognition poster."""
    try:
        # Fetch students
        result = await db.execute(select(Student).where(Student.student_id.in_(req.studentIds)))
        students = result.scalars().all()
        
        if not students:
            raise HTTPException(status_code=404, detail="No students found")
            
        student_data = []
        for s in students:
            student_data.append({
                "name": s.student_name,
                "registration_number": s.student_id,
                "photo_url": s.photo_url or s.profile_photo  # fallback to profile_photo
            })
            
        # Format title
        display_title = req.achievementType.replace("_", " ").title()
        
        data = {
            "month": req.month,
            "year": req.year,
            "achievement_type_display": display_title,
            "students": student_data
        }
        
        image_bytes = await image_service.generate_student_poster(data)
        image_url = await storage_service.upload_image(image_bytes, prefix=f"recognition-{req.month.lower()}-{req.year}")
        
        # Save to history
        record = GeneratedImage(
            type="recognition",
            month=req.month,
            year=req.year,
            image_url=image_url
        )
        db.add(record)
        await db.commit()
        
        return {"success": True, "imageUrl": image_url}
    except Exception as e:
        logger.error(f"Failed to generate student poster: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate image")

@router.get("/")
async def list_generated_images(db: AsyncSession = Depends(get_db)):
    """List history of generated images."""
    result = await db.execute(select(GeneratedImage).order_by(GeneratedImage.created_at.desc()))
    images = result.scalars().all()
    return images
