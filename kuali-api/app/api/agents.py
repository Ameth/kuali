# app/api/agents.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Agent, Audit

router = APIRouter(prefix="/api/v1/agents", tags=["Asesores"])


# Esquema para listado de asesores
class AgentListItem(BaseModel):
    id: str
    name: str
    extension: str
    is_active: bool

    class Config:
        from_attributes = True


# Esquema para métricas individuales del asesor
class AgentPerformanceResponse(BaseModel):
    agent_id: str
    name: str
    extension: str
    total_audits: int
    completed_audits: int
    average_score: Optional[float]
    average_empathy: Optional[float]
    script_compliance_rate: Optional[float]


@router.get("", response_model=List[AgentListItem])
def list_agents(is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    """
    Retorna la lista de asesores registrados para alimentar los filtros del dashboard.
    """
    query = db.query(Agent)
    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)

    agents = query.order_by(Agent.name).all()

    return [
        AgentListItem(
            id=str(a.id), name=a.name, extension=a.extension, is_active=a.is_active
        )
        for a in agents
    ]


@router.get("/{agent_id}/metrics", response_model=AgentPerformanceResponse)
def get_agent_performance(agent_id: str, db: Session = Depends(get_db)):
    """
    Retorna el desempeño acumulado y métricas de calidad de un asesor específico.
    """
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asesor no encontrado"
        )

    total_audits = (
        db.query(func.count(Audit.id)).filter(Audit.agent_id == agent.id).scalar() or 0
    )
    completed_audits = (
        db.query(func.count(Audit.id))
        .filter(Audit.agent_id == agent.id, Audit.status == "completed")
        .scalar()
        or 0
    )

    promedios = (
        db.query(func.avg(Audit.overall_score), func.avg(Audit.empathy_score))
        .filter(Audit.agent_id == agent.id, Audit.status == "completed")
        .first()
    )

    avg_score = (
        round(float(promedios[0]), 2)
        if promedios and promedios[0] is not None
        else None
    )
    avg_empathy = (
        round(float(promedios[1]), 2)
        if promedios and promedios[1] is not None
        else None
    )

    cumplen_guion = (
        db.query(func.count(Audit.id))
        .filter(
            Audit.agent_id == agent.id,
            Audit.status == "completed",
            Audit.script_compliance == True,
        )
        .scalar()
        or 0
    )

    compliance_rate = (
        round((cumplen_guion / completed_audits) * 100, 2)
        if completed_audits > 0
        else 0.0
    )

    return AgentPerformanceResponse(
        agent_id=str(agent.id),
        name=agent.name,
        extension=agent.extension,
        total_audits=total_audits,
        completed_audits=completed_audits,
        average_score=avg_score,
        average_empathy=avg_empathy,
        script_compliance_rate=compliance_rate,
    )
