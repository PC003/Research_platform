"""Seed script — creates a default admin user.

Run from the backend directory:
    python -m app.scripts.seed_admin

Default credentials:
    Email:    admin@research.edu
    Password: admin123
"""

import asyncio
import sys
from pathlib import Path

# Ensure the backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import select
from app.core.database import _async_session_factory, init_db
from app.models.user import User
from app.services.auth_service import hash_password


ADMIN_EMAIL = "admin@research.edu"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME = "Platform Admin"


async def seed_admin():
    """Create the default admin user if it doesn't already exist."""
    await init_db()

    async with _async_session_factory() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"⚠️  Admin user already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_NAME,
            role="admin",
        )
        session.add(admin)
        await session.commit()

        print(f"✅ Admin user created:")
        print(f"   Email:    {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Role:     admin")


if __name__ == "__main__":
    asyncio.run(seed_admin())
