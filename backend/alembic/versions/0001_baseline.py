"""Baseline — stamp existing schema.

Revision ID: 0001
Revises: None
Create Date: 2026-07-29

This is a baseline migration. The schema was originally created via
migrations/001_initial_schema.sql. This revision exists so Alembic
knows the starting point.
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Schema already exists — this is a stamp-only baseline.
    pass


def downgrade() -> None:
    # Cannot downgrade baseline.
    pass
