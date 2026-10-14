import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)  # Ej: Centro Inca
    is_active = Column(Boolean, default=True)
    audit_percentage = Column(
        Integer, default=100
    )  # Porcentaje de auditoría (control de tokens)
    created_at = Column(DateTime, default=datetime.utcnow)

    pbx_integrations = relationship("PBXIntegration", back_populates="company")
    agents = relationship("Agent", back_populates="company")
    audits = relationship("Audit", back_populates="company")


class PBXIntegration(Base):
    __tablename__ = "pbx_integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name = Column(String(100), nullable=False)  # Ej: Issabel Centro Inca
    api_key = Column(
        String(255), unique=True, nullable=False, index=True
    )  # Token que usará el script de PBX
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="pbx_integrations")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    extension = Column(String(20), nullable=False, index=True)  # Ej: 1690, 1693
    name = Column(String(150), nullable=False)  # Nombre del asesor
    default_queue = Column(String(50), nullable=True)  # Ej: 919
    is_active = Column(Boolean, default=True)

    company = relationship("Company", back_populates="agents")
    audits = relationship("Audit", back_populates="agent")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    agent_id = Column(
        UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True, index=True
    )

    uniqueid = Column(String(100), nullable=False, index=True)
    queue = Column(String(50), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    call_date = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, default=0)
    audio_url = Column(Text, nullable=True)

    transcription = Column(Text, nullable=True)
    analysis_result = Column(JSONB, nullable=True)

    overall_score = Column(Float, nullable=True)
    empathy_score = Column(Float, nullable=True)
    script_compliance = Column(Boolean, nullable=True)
    detected_program = Column(String(150), nullable=True)

    tokens_used = Column(Integer, default=0)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="audits")
    agent = relationship("Agent", back_populates="audits")
