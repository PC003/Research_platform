"""API endpoints for generating posters and analytics images."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct, extract
import logging

from app.core.auth import require_admin
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
    format: str = "png"

@router.post("/analytics-summary")
async def generate_analytics_summary(req: AnalyticsSummaryRequest, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    """Generate the analytics summary dashboard filtered by month/year."""
    try:
        month_map = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12
        }
        month_int = month_map.get(req.month, 1)

        # Base filter: match the requested year AND month
        base_filter = [
            PaperORM.publication_year == req.year,
            extract('month', PaperORM.publication_date) == month_int,
        ]

        # ── Aggregate counts for the specific month/year ──
        total_pubs = await db.scalar(
            select(func.count(PaperORM.id)).where(*base_filter)
        ) or 0

        total_students = await db.scalar(
            select(func.count(distinct(PaperORM.student_id))).where(*base_filter)
        ) or 0

        # ── Impact factor stats ──
        avg_if = await db.scalar(
            select(func.round(func.avg(PaperORM.impact_factor), 2)).where(
                *base_filter, PaperORM.impact_factor.isnot(None)
            )
        )
        max_if = await db.scalar(
            select(func.max(PaperORM.impact_factor)).where(
                *base_filter, PaperORM.impact_factor.isnot(None)
            )
        )

        # ── Paper type breakdown (actual DB counts) ──
        j_count = await db.scalar(
            select(func.count(PaperORM.id)).where(*base_filter, PaperORM.paper_type == "Journal")
        ) or 0
        c_count = await db.scalar(
            select(func.count(PaperORM.id)).where(*base_filter, PaperORM.paper_type == "Conference")
        ) or 0
        b_count = await db.scalar(
            select(func.count(PaperORM.id)).where(*base_filter, PaperORM.paper_type == "Book Chapter")
        ) or 0

        # ── Journal quartile breakdown (based on impact factor ranges) ──
        q1_count = await db.scalar(
            select(func.count(PaperORM.id)).where(
                *base_filter, PaperORM.paper_type == "Journal",
                PaperORM.impact_factor >= 5
            )
        ) or 0
        q2_count = await db.scalar(
            select(func.count(PaperORM.id)).where(
                *base_filter, PaperORM.paper_type == "Journal",
                PaperORM.impact_factor >= 3, PaperORM.impact_factor < 5
            )
        ) or 0
        q3_count = await db.scalar(
            select(func.count(PaperORM.id)).where(
                *base_filter, PaperORM.paper_type == "Journal",
                PaperORM.impact_factor >= 1, PaperORM.impact_factor < 3
            )
        ) or 0
        q4_count = await db.scalar(
            select(func.count(PaperORM.id)).where(
                *base_filter, PaperORM.paper_type == "Journal",
                PaperORM.impact_factor < 1
            )
        ) or 0

        # ── Per-school breakdown (real data) ──
        school_rows = (await db.execute(
            select(
                PaperORM.school,
                func.count(PaperORM.id).label("pub_count"),
                func.count(distinct(PaperORM.student_id)).label("stu_count"),
            )
            .where(*base_filter, PaperORM.school.isnot(None))
            .group_by(PaperORM.school)
            .order_by(func.count(PaperORM.id).desc())
        )).all()

        school_labels = [r.school for r in school_rows] if school_rows else ["No Data"]
        school_pubs = [r.pub_count for r in school_rows] if school_rows else [0]
        school_students = [r.stu_count for r in school_rows] if school_rows else [0]

        data = {
            "month": req.month,
            "year": req.year,
            "total_publications": total_pubs,
            "total_students": total_students,
            "avg_impact_factor": str(avg_if or "0.0"),
            "max_impact_factor": str(max_if or "0.0"),
            "journal_count": j_count,
            "conference_count": c_count,
            "book_chapter_count": b_count,
            "q1_count": q1_count,
            "q2_count": q2_count,
            "q3_count": q3_count,
            "q4_count": q4_count,
            "school_labels": school_labels,
            "school_pubs": school_pubs,
            "school_students": school_students,
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
async def generate_student_recognition(req: StudentRecognitionRequest, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    """Generate the student recognition poster."""
    try:
        # Map achievement type to paper type
        achievement_map = {
            "journal_publications": "Journal",
            "conference_presentations": "Conference",
            "patents_filed": "Patent",
            "research_awards": "Award"
        }
        paper_type = achievement_map.get(req.achievementType, "Journal")
        
        month_map = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12
        }
        month_int = month_map.get(req.month, 1)

        # Get students who published in that month/year
        stmt = (
            select(Student)
            .join(PaperORM, Student.student_id == PaperORM.student_id)
            .where(
                PaperORM.publication_year == req.year,
                extract('month', PaperORM.publication_date) == month_int,
                PaperORM.paper_type == paper_type
            )
            .distinct()
            .limit(36)
        )
        result = await db.execute(stmt)
        students = result.scalars().all()
        
        if not students:
            raise HTTPException(status_code=404, detail="No students found")
            
        student_data = []
        for s in students:
            student_data.append({
                "name": s.student_name,
                "registration_number": s.student_id,
                "photo_url": s.photo_url
            })
            
        # Format title
        display_title = req.achievementType.replace("_", " ").title()
        
        # Fetch global counts for the month/year
        j_count = await db.scalar(select(func.count(PaperORM.id)).where(PaperORM.publication_year == req.year, extract('month', PaperORM.publication_date) == month_int, PaperORM.paper_type == "Journal"))
        c_count = await db.scalar(select(func.count(PaperORM.id)).where(PaperORM.publication_year == req.year, extract('month', PaperORM.publication_date) == month_int, PaperORM.paper_type == "Conference"))
        p_count = await db.scalar(select(func.count(PaperORM.id)).where(PaperORM.publication_year == req.year, extract('month', PaperORM.publication_date) == month_int, PaperORM.paper_type == "Patent"))
        
        data = {
            "month": req.month,
            "year": req.year,
            "achievement_type_display": display_title,
            "students": student_data,
            "journal_count": j_count or 0,
            "conference_count": c_count or 0,
            "patent_count": p_count or 0
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
    except HTTPException:
        raise
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Failed to generate student poster: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate image")

@router.get("/")
async def list_generated_images(db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    """List history of generated images."""
    result = await db.execute(select(GeneratedImage).order_by(GeneratedImage.created_at.desc()))
    images = result.scalars().all()
    return images
