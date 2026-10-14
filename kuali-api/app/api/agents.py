# app/api/agents.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Agent, Audit, User

router = APIRouter(prefix="/api/v1/agents", tags=["Asesores"])


class AgentListItem(BaseModel):
    id: str
    name: str
    extension: str
    is_active: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[AgentListItem])
def list_agents(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Agent).filter(Agent.company_id == current_user.company_id)
    if is_active is not None:
        query = query.filter(Agent.is_active == is_active)

    agents = query.order_by(Agent.name).all()

    return [
        AgentListItem(
            id=str(a.id), name=a.name, extension=a.extension, is_active=a.is_active
        )
        for a in agents
    ]
