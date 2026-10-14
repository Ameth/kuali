# app/api/audits.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, cast, Date
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Audit, Agent

router = APIRouter(prefix="/api/v1/audits", tags=["Auditorías y Reportes"])


# Esquema para listado general de auditorías
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


# Esquema para el detalle completo de una auditoría individual
class AuditDetailResponse(AuditItemResponse):
    company_id: str
    queue: Optional[str]
    transcription: Optional[str]
    analysis_result: Optional[Dict[str, Any]]


# Esquemas para las métricas del dashboard
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


@router.get("/metrics/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Retorna métricas consolidadas, KPIs de calidad y estadísticas por asesor/programa.
    """
    total_audits = db.query(func.count(Audit.id)).scalar() or 0
    completed_audits = (
        db.query(func.count(Audit.id)).filter(Audit.status == "completed").scalar() or 0
    )

    promedios = (
        db.query(func.avg(Audit.overall_score), func.avg(Audit.empathy_score))
        .filter(Audit.status == "completed")
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
        .filter(Audit.status == "completed", Audit.script_compliance == True)
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
        .filter(Audit.detected_program.isnot(None), Audit.detected_program != "")
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
        .outerjoin(Audit, Agent.id == Audit.agent_id)
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


@router.get("/metrics/timeline", response_model=List[TimelinePoint])
def get_quality_timeline(
    start_date: Optional[date] = Query(None, description="Fecha inicial (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Fecha final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    Retorna la tendencia histórica de calificaciones y volumen de llamadas agrupado por día.
    """
    date_col = cast(Audit.call_date, Date)

    query = db.query(
        date_col.label("day"),
        func.count(Audit.id).label("total_calls"),
        func.avg(Audit.overall_score).label("avg_score"),
    )

    if start_date:
        query = query.filter(date_col >= start_date)
    if end_date:
        query = query.filter(date_col <= end_date)

    points = query.group_by(date_col).order_by(date_col.asc()).all()

    return [
        TimelinePoint(
            date=row[0],
            total_calls=row[1],
            average_score=round(float(row[2]), 2) if row[2] is not None else None,
        )
        for row in points
    ]


@router.get("", response_model=List[AuditItemResponse])
def get_audits(
    agent_id: Optional[str] = Query(None, description="Filtrar por UUID de asesor"),
    detected_program: Optional[str] = Query(
        None, description="Filtrar por programa detectado"
    ),
    min_score: Optional[float] = Query(
        None, description="Nota global mínima (1.0 a 10.0)"
    ),
    max_score: Optional[float] = Query(
        None, description="Nota global máxima (1.0 a 10.0)"
    ),
    limit: int = Query(
        50, ge=1, le=100, description="Cantidad de registros a devolver"
    ),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación"),
    db: Session = Depends(get_db),
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

    resultado = []
    for a in auditorias:
        resultado.append(
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
        )

    return resultado


@router.get("/{audit_id}", response_model=AuditDetailResponse)
def get_audit_detail(audit_id: str, db: Session = Depends(get_db)):
    """
    Retorna el detalle completo y análisis profundo de una auditoría específica.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()

    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Auditoría no encontrada"
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
