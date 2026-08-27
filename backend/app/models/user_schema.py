"""Pydantic schemas for user authentication and profiles."""

from pydantic import BaseModel, Field, EmailStr


class UserCreate(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    password: str = Field(min_length=6, description="Minimum 6 characters")
    full_name: str = Field(min_length=1, max_length=150)


class UserLogin(BaseModel):
    """Payload for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user profile — never exposes the password hash."""

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token returned after successful login."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
