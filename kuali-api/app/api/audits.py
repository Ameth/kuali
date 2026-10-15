# app/api/audits.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, cast, Date, or_
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Audit, Agent, User

router = APIRouter(prefix="/api/v1/audits", tags=["Auditorías y Reportes"])


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


class AuditDetailResponse(AuditItemResponse):
    company_id: str
    queue: Optional[str]
    transcription: Optional[str]
    analysis_result: Optional[Dict[str, Any]]


class AgentMetric(BaseModel):
    agent_name: str
    agent_extension: Optional[str]
    total_calls: int
    average_score: Optional[float]


class ProgramMetric(BaseModel):
    program_name: str
    count: int


class TimelinePoint(BaseModel):
    date: date
    total_calls: int
    average_score: Optional[float]


class DashboardMetricsResponse(BaseModel):
    total_audits: int
    completed_audits: int
    average_overall_score: Optional[float]
    average_empathy_score: Optional[float]
    script_compliance_rate: Optional[float]
    top_programs: List[ProgramMetric]
    agents_summary: List[AgentMetric]


class PaginatedAuditsResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    items: List[AuditItemResponse]


@router.get("/metrics/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Retorna métricas consolidadas aisladas por la empresa del usuario activo.
    """
    c_id = current_user.company_id

    total_audits = (
        db.query(func.count(Audit.id)).filter(Audit.company_id == c_id).scalar() or 0
    )
    completed_audits = (
        db.query(func.count(Audit.id))
        .filter(Audit.company_id == c_id, Audit.status == "completed")
        .scalar()
        or 0
    )

    promedios = (
        db.query(func.avg(Audit.overall_score), func.avg(Audit.empathy_score))
        .filter(Audit.company_id == c_id, Audit.status == "completed")
        .first()
    )

    avg_overall = (
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
            Audit.company_id == c_id,
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

    programas_raw = (
        db.query(Audit.detected_program, func.count(Audit.id).label("total"))
        .filter(
            Audit.company_id == c_id,
            Audit.detected_program.isnot(None),
            Audit.detected_program != "",
        )
        .group_by(Audit.detected_program)
        .order_by(desc("total"))
        .limit(5)
        .all()
    )

    top_programs = [
        ProgramMetric(program_name=row[0], count=row[1]) for row in programas_raw
    ]

    asesores_raw = (
        db.query(
            Agent.name,
            Agent.extension,
            func.count(Audit.id).label("total_llamadas"),
            func.avg(Audit.overall_score).label("promedio_nota"),
        )
        .outerjoin(Audit, (Agent.id == Audit.agent_id) & (Audit.company_id == c_id))
        .filter(Agent.company_id == c_id)
        .group_by(Agent.id, Agent.name, Agent.extension)
        .all()
    )

    agents_summary = [
        AgentMetric(
            agent_name=row[0],
            agent_extension=row[1],
            total_calls=row[2],
            average_score=round(float(row[3]), 2) if row[3] is not None else None,
        )
        for row in asesores_raw
    ]

    return DashboardMetricsResponse(
        total_audits=total_audits,
        completed_audits=completed_audits,
        average_overall_score=avg_overall,
        average_empathy_score=avg_empathy,
        script_compliance_rate=compliance_rate,
        top_programs=top_programs,
        agents_summary=agents_summary,
    )


@router.get("", response_model=PaginatedAuditsResponse)
def get_audits(
    agent_id: Optional[str] = Query(None),
    detected_program: Optional[str] = Query(None),  # o search_query
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c_id = current_user.company_id
    query = (
        db.query(Audit)
        .join(Agent, Audit.agent_id == Agent.id, isouter=True)
        .filter(Audit.company_id == c_id)
    )

    if agent_id:
        query = query.filter(Audit.agent_id == agent_id)

    # Búsqueda combinada: programa o teléfono del cliente
    filtro_texto = search or detected_program
    if filtro_texto:
        query = query.filter(
            or_(
                Audit.detected_program.ilike(f"%{filtro_texto}%"),
                Audit.customer_phone.ilike(f"%{filtro_texto}%"),
            )
        )

    if min_score is not None:
        query = query.filter(Audit.overall_score >= min_score)
    if max_score is not None:
        query = query.filter(Audit.overall_score <= max_score)

    # Filtros de fecha
    if start_date:
        try:
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Audit.call_date >= s_date)
        except ValueError:
            pass

    if end_date:
        try:
            e_date = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(Audit.call_date <= e_date)
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    auditorias = query.order_by(desc(Audit.call_date)).offset(offset).limit(limit).all()

    items = [
        AuditItemResponse(
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
            detected_program=a.detected_program,
        )
        for a in auditorias
    ]

    return PaginatedAuditsResponse(
        total=total, page=page, limit=limit, total_pages=total_pages, items=items
    )


@router.get("/{audit_id}", response_model=AuditDetailResponse)
def get_audit_detail(
    audit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    audit = (
        db.query(Audit)
        .filter(Audit.id == audit_id, Audit.company_id == current_user.company_id)
        .first()
    )

    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Auditoría no encontrada o no pertenece a su empresa",
        )

    return AuditDetailResponse(
        id=str(audit.id),
        uniqueid=audit.uniqueid,
        call_date=audit.call_date,
        duration_seconds=audit.duration_seconds or 0,
        customer_phone=audit.customer_phone,
        agent_name=audit.agent.name if audit.agent else "Sin asignar",
        agent_extension=audit.agent.extension if audit.agent else None,
        status=audit.status,
        overall_score=audit.overall_score,
        empathy_score=audit.empathy_score,
        script_compliance=audit.script_compliance,
        detected_program=audit.detected_program,
        company_id=str(audit.company_id),
        queue=audit.queue,
        transcription=audit.transcription,
        analysis_result=audit.analysis_result,
    )
