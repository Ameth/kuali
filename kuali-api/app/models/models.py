# app/models/models.py
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
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    users = relationship("User", back_populates="company")
    agents = relationship("Agent", back_populates="company")
    audits = relationship("Audit", back_populates="company")
    pbx_integrations = relationship("PBXIntegration", back_populates="company")


class PBXIntegration(Base):
    __tablename__ = "pbx_integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(100), default="Asterisk PBX")
    api_key = Column(String(255), unique=True, nullable=False, index=True)
    pbx_type = Column(String(50), default="issabel", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="pbx_integrations")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(50), default="supervisor")  # admin, supervisor, auditor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(120), nullable=False)
    extension = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="agents")
    audits = relationship("Audit", back_populates="agent")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_id = Column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )

    uniqueid = Column(String(100), unique=True, nullable=False, index=True)
    call_date = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Integer, default=0)
    customer_phone = Column(String(50), nullable=True)
    queue = Column(String(50), nullable=True)
    audio_path = Column(String(255), nullable=True)

    # Estados: pending, processing, completed, failed
    status = Column(String(30), default="pending")

    transcription = Column(Text, nullable=True)
    overall_score = Column(Float, nullable=True)
    empathy_score = Column(Float, nullable=True)
    script_compliance = Column(Boolean, nullable=True)
    detected_program = Column(String(120), nullable=True)
    analysis_result = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="audits")
    agent = relationship("Agent", back_populates="audits")


# app/models/models.py (Añadir al final)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(
        String(100), unique=True, nullable=False
    )  # ej: "gemini_model", "gemini_prompt", "temperature"
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompanyAIConfig(Base):
    __tablename__ = "company_ai_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    gemini_model = Column(String(100), default="gemini-1.5-flash", nullable=False)
    temperature = Column(Float, default=0.2, nullable=False)
    audit_prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(100), nullable=True)

    company = relationship("Company", backref="ai_config")
