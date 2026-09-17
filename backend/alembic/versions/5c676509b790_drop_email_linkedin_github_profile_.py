"""drop_email_linkedin_github_profile_photo_from_students

Revision ID: 5c676509b790
Revises: 31d6564a20af
Create Date: 2026-09-09 18:20:22.178775
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5c676509b790'
down_revision: Union[str, None] = '31d6564a20af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop removed columns from students table
    op.drop_column('students', 'email')
    op.drop_column('students', 'github_url')
    op.drop_column('students', 'profile_photo')
    op.drop_column('students', 'linkedin_url')
    # Add comment to photo_url (now the single photo column)
    op.alter_column('students', 'photo_url',
               existing_type=sa.TEXT(),
               comment='Cloudinary / S3 URL',
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # Re-add dropped columns to students table
    op.add_column('students', sa.Column('linkedin_url', sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('students', sa.Column('profile_photo', sa.TEXT(), autoincrement=False, nullable=True, comment='Cloudinary / S3 URL'))
    op.add_column('students', sa.Column('github_url', sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('students', sa.Column('email', sa.VARCHAR(length=150), autoincrement=False, nullable=True))
    op.alter_column('students', 'photo_url',
               existing_type=sa.TEXT(),
               comment=None,
               existing_comment='Cloudinary / S3 URL',
               existing_nullable=True)
    # ### end Alembic commands ###
