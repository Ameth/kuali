# app/api/audits.py
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Audit, Agent

router = APIRouter(prefix="/api/v1/audits", tags=["Auditorías y Reportes"])

# Esquema de respuesta para la lista
class AuditItemResponse(BaseModel):
    id: str
    uniqueid: str
    call_date: datetime
    duration_seconds: int
    customer_phone: Optional[str]
    agent_name: Optional[str]
    agent_extension: Optional[str]
    status: str
    overall_score: Optional[float]
    empathy_score: Optional[float]
    script_compliance: Optional[bool]
    detected_program: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditItemResponse])
def get_audits(
    agent_id: Optional[str] = Query(None, description="Filtrar por UUID de asesor"),
    detected_program: Optional[str] = Query(None, description="Filtrar por programa detectado"),
    min_score: Optional[float] = Query(None, description="Nota global mínima (1.0 a 10.0)"),
    max_score: Optional[float] = Query(None, description="Nota global máxima (1.0 a 10.0)"),
    limit: int = Query(50, ge=1, le=100, description="Cantidad de registros a devolver"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación"),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de auditorías con soporte de filtros y paginación.
    """
    query = db.query(Audit).join(Agent, Audit.agent_id == Agent.id, isouter=True)

    if agent_id:
        query = query.filter(Audit.agent_id == agent_id)
    if detected_program:
        query = query.filter(Audit.detected_program.ilike(f"%{detected_program}%"))
    if min_score is not None:
        query = query.filter(Audit.overall_score >= min_score)
    if max_score is not None:
        query = query.filter(Audit.overall_score <= max_score)

    auditorias = query.order_by(desc(Audit.call_date)).offset(offset).limit(limit).all()

    # Mapear respuesta incluyendo nombre y extensión del asesor
    resultado = []
    for a in auditorias:
        resultado.append(AuditItemResponse(
            id=str(a.id),
            uniqueid=a.uniqueid,
            call_date=a.call_date,
            duration_seconds=a.duration_seconds or 0,
            customer_phone=a.customer_phone,
            agent_name=a.agent.name if a.agent else "Sin asignar",
            agent_extension=a.agent.extension if a.agent else None,
            status=a.status,
            overall_score=a.overall_score,
            empathy_score=a.empathy_score,
            script_compliance=a.script_compliance,
            detected_program=a.detected_program
        ))

    return resultado