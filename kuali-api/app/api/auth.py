# app/api/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


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

    # Validar si el usuario está inactivo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo en el sistema",
        )

    # Validar si la empresa está inactiva (a menos que sea superadmin)
    if user.role != "superadmin":
        if user.company and not getattr(user.company, "is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El acceso para esta empresa se encuentra suspendido. Comuníquese con soporte de Kuali.",
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


@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite al usuario autenticado cambiar su contraseña validando la anterior.
    """
    # 1. Validar contraseña actual
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta.",
        )

    # 2. Evitar que reutilice la misma clave
    if verify_password(data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña no puede ser idéntica a la anterior.",
        )

    # 3. Hashear y actualizar en base de datos
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    return {"status": "success", "message": "Contraseña actualizada exitosamente."}
