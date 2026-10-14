# app/services/evaluator.py
import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


class AuditEvaluation(BaseModel):
    overall_score: float = Field(..., description="Calificación global de 1.0 a 10.0")
    empathy_score: float = Field(
        ..., description="Puntaje de empatía y tono cordial de 1.0 a 10.0"
    )
    script_compliance: bool = Field(
        ...,
        description="Indica si cumplió con saludo institucional, validación de necesidad y cierre",
    )
    detected_program: str = Field(
        ..., description="Nombre del programa académico consultado"
    )
    agent_strengths: list[str] = Field(
        ..., description="Puntos fuertes observados en la interacción"
    )
    areas_for_improvement: list[str] = Field(
        ..., description="Oportunidades de mejora para coaching del asesor"
    )
    objections_handled: list[str] = Field(
        ..., description="Objeciones o inquietudes planteadas y cómo se resolvieron"
    )
    summary: str = Field(..., description="Resumen ejecutivo conciso de la llamada")


async def evaluar_auditoria(transcripcion: str, nombre_asesor: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY no está configurada en las variables de entorno."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    Eres un auditor experto en Quality Assurance (QA) para call centers de instituciones educativas (Centro Inca).
    Evalúa la siguiente conversación atendida por el asesor '{nombre_asesor}'.

    Aspectos a evaluar:
    1. Saludo corporativo y presentación personal.
    2. Identificación del programa educativo de interés.
    3. Información clara de precios, requisitos y horarios.
    4. Empatía y tono conversacional.
    5. Cierre comercial efectivo (invitación a matricularse o visitar la sede).

    Transcripción:
    \"\"\"{transcripcion}\"\"\"
    """

    response = client.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AuditEvaluation,
            temperature=0.2,
        ),
    )

    return json.loads(response.text)
