# app/api/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.models.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    full_name: str
    email: str
    role: str
    company_id: str
    company_name: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    company_id: str
    company_name: str

    class Config:
        from_attributes = True


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Inicia sesión validando credenciales y devuelve el token JWT con aislamiento por cliente.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo en el sistema",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "company_id": str(user.company_id),
            "role": user.role,
        },
        expires_delta=access_token_expires,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        company_id=str(user.company_id),
        company_name=user.company.name if user.company else "Sin asignar",
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retorna la información del usuario autenticado actualmente.
    """
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        company_id=str(current_user.company_id),
        company_name=(
            current_user.company.name if current_user.company else "Sin asignar"
        ),
    )
