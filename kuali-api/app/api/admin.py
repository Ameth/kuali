# app/api/admin.py
import secrets
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import require_superadmin, get_password_hash
from app.models.models import Company, PBXIntegration, User, Audit, SystemConfig
from app.models.models import CompanyAIConfig

router = APIRouter(prefix="/api/v1/admin", tags=["Panel Super Administrador"])

# --- Esquemas Pydantic ---


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2)
    pbx_type: Optional[str] = "issabel"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    pbx_type: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    is_active: bool = True
    total_audits: int
    api_key: Optional[str] = None
    pbx_type: Optional[str] = "issabel"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreateForCompany(BaseModel):
    email: str
    full_name: str
    password: str = Field(..., min_length=6)
    role: str = "admin"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    company_id: str

    class Config:
        from_attributes = True


class AIConfigUpdate(BaseModel):
    gemini_model: str = "gemini-1.5-flash"
    temperature: float = 0.2
    audit_prompt: str


class CompanyAIConfigResponse(BaseModel):
    company_id: str
    company_name: str
    gemini_model: str
    temperature: float
    audit_prompt: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


# --- Endpoints de Gestión de Empresas (Tenants) ---


@router.get("/companies", response_model=List[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db), admin_user: User = Depends(require_superadmin)
):
    companies = db.query(Company).order_by(Company.name).all()
    result = []

    for c in companies:
        total_calls = (
            db.query(func.count(Audit.id)).filter(Audit.company_id == c.id).scalar()
            or 0
        )

        pbx = db.query(PBXIntegration).filter(PBXIntegration.company_id == c.id).first()

        is_active_val = getattr(c, "is_active", True)
        created_val = (
            str(getattr(c, "created_at", ""))
            if getattr(c, "created_at", None)
            else None
        )
        updated_val = (
            str(getattr(c, "updated_at", ""))
            if getattr(c, "updated_at", None)
            else None
        )
        updated_by_val = getattr(c, "updated_by", None)

        pbx_type_val = getattr(pbx, "pbx_type", "issabel") if pbx else "issabel"
        api_key_val = pbx.api_key if pbx else None

        result.append(
            CompanyResponse(
                id=str(c.id),
                name=c.name,
                is_active=bool(is_active_val),
                total_audits=total_calls,
                api_key=api_key_val,
                pbx_type=pbx_type_val,
                created_at=created_val,
                updated_at=updated_val,
                updated_by=updated_by_val,
            )
        )

    return result


@router.post("/companies", response_model=CompanyResponse)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    existe = db.query(Company).filter(Company.name.ilike(data.name.strip())).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una empresa con ese nombre.",
        )

    nueva_empresa = Company(name=data.name.strip())
    if hasattr(Company, "is_active"):
        setattr(nueva_empresa, "is_active", True)
    if hasattr(Company, "updated_by"):
        setattr(nueva_empresa, "updated_by", admin_user.email)
    if hasattr(Company, "updated_at"):
        setattr(nueva_empresa, "updated_at", datetime.utcnow())

    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)

    raw_key = f"kuali_live_{secrets.token_hex(24)}"
    pbx_type_val = data.pbx_type.strip().lower() if data.pbx_type else "issabel"

    pbx = PBXIntegration(
        company_id=nueva_empresa.id,
        api_key=raw_key,
        pbx_type=pbx_type_val,
        is_active=True,
    )
    if hasattr(PBXIntegration, "updated_by"):
        setattr(pbx, "updated_by", admin_user.email)
    if hasattr(PBXIntegration, "updated_at"):
        setattr(pbx, "updated_at", datetime.utcnow())

    db.add(pbx)
    db.commit()

    return CompanyResponse(
        id=str(nueva_empresa.id),
        name=nueva_empresa.name,
        is_active=True,
        total_audits=0,
        api_key=raw_key,
        pbx_type=pbx_type_val,
        created_at=str(getattr(nueva_empresa, "created_at", datetime.utcnow())),
        updated_at=str(datetime.utcnow()),
        updated_by=admin_user.email,
    )


@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: UUID,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if data.name:
        company.name = data.name.strip()
    if data.is_active is not None and hasattr(company, "is_active"):
        company.is_active = data.is_active

    if hasattr(company, "updated_at"):
        company.updated_at = datetime.utcnow()
    if hasattr(company, "updated_by"):
        company.updated_by = admin_user.email

    pbx = (
        db.query(PBXIntegration).filter(PBXIntegration.company_id == company.id).first()
    )
    if pbx and data.pbx_type:
        pbx.pbx_type = data.pbx_type.strip().lower()
        if hasattr(pbx, "updated_at"):
            pbx.updated_at = datetime.utcnow()
        if hasattr(pbx, "updated_by"):
            pbx.updated_by = admin_user.email

    db.commit()
    db.refresh(company)

    total_calls = (
        db.query(func.count(Audit.id)).filter(Audit.company_id == company.id).scalar()
        or 0
    )

    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        is_active=bool(getattr(company, "is_active", True)),
        total_audits=total_calls,
        api_key=pbx.api_key if pbx else None,
        pbx_type=getattr(pbx, "pbx_type", "issabel") if pbx else "issabel",
        created_at=str(getattr(company, "created_at", "")),
        updated_at=str(getattr(company, "updated_at", "")),
        updated_by=getattr(company, "updated_by", None),
    )


@router.put("/companies/{company_id}/toggle-status")
def toggle_company_status(
    company_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    current_status = getattr(company, "is_active", True)
    company.is_active = not current_status
    if hasattr(company, "updated_at"):
        company.updated_at = datetime.utcnow()
    if hasattr(company, "updated_by"):
        company.updated_by = admin_user.email

    db.commit()

    return {
        "status": "success",
        "company_id": str(company.id),
        "is_active": company.is_active,
        "message": f"Empresa {'activada' if company.is_active else 'inactivada'} correctamente.",
    }


@router.post("/companies/{company_id}/regenerate-key")
def regenerate_pbx_key(
    company_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    new_key = f"kuali_live_{secrets.token_hex(24)}"
    pbx = (
        db.query(PBXIntegration).filter(PBXIntegration.company_id == company.id).first()
    )

    if pbx:
        pbx.api_key = new_key
        if hasattr(pbx, "is_active"):
            pbx.is_active = True
        if hasattr(pbx, "updated_at"):
            pbx.updated_at = datetime.utcnow()
        if hasattr(pbx, "updated_by"):
            pbx.updated_by = admin_user.email
    else:
        pbx = PBXIntegration(
            company_id=company.id, api_key=new_key, pbx_type="issabel", is_active=True
        )
        if hasattr(pbx, "updated_by"):
            pbx.updated_by = admin_user.email
        db.add(pbx)

    db.commit()
    return {
        "status": "success",
        "message": "Nueva API Key generada exitosamente",
        "api_key": new_key,
    }


# --- Endpoints de Usuarios del Tenant ---


@router.get("/companies/{company_id}/users", response_model=List[UserResponse])
def get_company_users(
    company_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    users = db.query(User).filter(User.company_id == company_id).all()
    return [
        UserResponse(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            company_id=str(u.company_id),
        )
        for u in users
    ]


@router.post("/companies/{company_id}/users", response_model=UserResponse)
def create_user_for_company(
    company_id: UUID,
    data: UserCreateForCompany,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    user_exists = db.query(User).filter(User.email == data.email.strip()).first()
    if user_exists:
        raise HTTPException(
            status_code=400, detail="El correo ya se encuentra registrado"
        )

    new_user = User(
        company_id=company.id,
        email=data.email.strip().lower(),
        full_name=data.full_name.strip(),
        hashed_password=get_password_hash(data.password),
        role=data.role,
        is_active=True,
    )
    if hasattr(new_user, "updated_by"):
        setattr(new_user, "updated_by", admin_user.email)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        company_id=str(new_user.company_id),
    )


# --- Parámetros de IA ---

DEFAULT_PROMPT = """Eres el motor auditor de calidad 'Kuali'. Analiza la transcripción de la llamada entre un asesor y un prospecto.
Evalúa con objetividad:
1. overall_score (1.0 a 10.0)
2. empathy_score (1.0 a 10.0)
3. script_compliance (true/false)
4. detected_program (nombre del programa de interés o null)
5. agent_strengths (lista de puntos positivos)
6. areas_for_improvement (lista de oportunidades de mejora)
7. objections_handled (lista de objeciones resueltas)
8. summary (resumen ejecutivo de 3 oraciones)"""


@router.get("/ai-config")
def get_ai_config(
    db: Session = Depends(get_db), admin_user: User = Depends(require_superadmin)
):
    configs = {c.key: c.value for c in db.query(SystemConfig).all()}
    return {
        "gemini_model": configs.get("gemini_model", "gemini-1.5-flash"),
        "temperature": float(configs.get("temperature", 0.2)),
        "audit_prompt": configs.get("audit_prompt", DEFAULT_PROMPT),
    }


@router.put("/ai-config")
def update_ai_config(
    data: AIConfigUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    updates = {
        "gemini_model": (data.gemini_model, "Modelo LLM de Gemini"),
        "temperature": (str(data.temperature), "Temperatura de muestreo"),
        "audit_prompt": (data.audit_prompt, "Prompt maestro de evaluación QA"),
    }

    for key, (val, desc) in updates.items():
        item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if item:
            item.value = val
        else:
            db.add(SystemConfig(key=key, value=val, description=desc))

    db.commit()
    return {
        "status": "success",
        "message": "Parámetros de IA actualizados correctamente en Kuali.",
    }


@router.get("/companies/{company_id}/ai-config", response_model=CompanyAIConfigResponse)
def get_company_ai_config(
    company_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    cfg = (
        db.query(CompanyAIConfig)
        .filter(CompanyAIConfig.company_id == company_id)
        .first()
    )

    if not cfg:
        # Si la empresa no tiene configuración propia, cargamos el default global
        global_configs = {c.key: c.value for c in db.query(SystemConfig).all()}
        return CompanyAIConfigResponse(
            company_id=str(company.id),
            company_name=company.name,
            gemini_model=global_configs.get("gemini_model", "gemini-1.5-flash"),
            temperature=float(global_configs.get("temperature", 0.2)),
            audit_prompt=global_configs.get("audit_prompt", DEFAULT_PROMPT),
            updated_at=None,
            updated_by=None,
        )

    return CompanyAIConfigResponse(
        company_id=str(company.id),
        company_name=company.name,
        gemini_model=cfg.gemini_model,
        temperature=float(cfg.temperature),
        audit_prompt=cfg.audit_prompt,
        updated_at=str(cfg.updated_at) if cfg.updated_at else None,
        updated_by=cfg.updated_by,
    )


@router.put("/companies/{company_id}/ai-config", response_model=CompanyAIConfigResponse)
def update_company_ai_config(
    company_id: UUID,
    data: AIConfigUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_superadmin),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    cfg = (
        db.query(CompanyAIConfig)
        .filter(CompanyAIConfig.company_id == company_id)
        .first()
    )

    if not cfg:
        cfg = CompanyAIConfig(
            company_id=company.id,
            gemini_model=data.gemini_model,
            temperature=data.temperature,
            audit_prompt=data.audit_prompt,
            updated_at=datetime.utcnow(),
            updated_by=admin_user.email,
        )
        db.add(cfg)
    else:
        cfg.gemini_model = data.gemini_model
        cfg.temperature = data.temperature
        cfg.audit_prompt = data.audit_prompt
        cfg.updated_at = datetime.utcnow()
        cfg.updated_by = admin_user.email

    db.commit()
    db.refresh(cfg)

    return CompanyAIConfigResponse(
        company_id=str(company.id),
        company_name=company.name,
        gemini_model=cfg.gemini_model,
        temperature=float(cfg.temperature),
        audit_prompt=cfg.audit_prompt,
        updated_at=str(cfg.updated_at),
        updated_by=cfg.updated_by,
    )
