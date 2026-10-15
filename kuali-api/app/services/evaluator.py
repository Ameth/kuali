# app/services/evaluator.py
import os
import json
from uuid import UUID
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.models.models import CompanyAIConfig, SystemConfig

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DEFAULT_PROMPT = """Eres el motor auditor de calidad 'Kuali'. Analiza la transcripción de la llamada entre un asesor y un prospecto.
Evalúa con objetividad y devuelve un JSON con las siguientes claves:
1. overall_score (número de 1.0 a 10.0)
2. empathy_score (número de 1.0 a 10.0)
3. script_compliance (booleano true/false)
4. detected_program (nombre del programa o servicio de interés, o null)
5. agent_strengths (lista de fortalezas observadas)
6. areas_for_improvement (lista de oportunidades de mejora)
7. objections_handled (lista de objeciones resueltas o tratadas)
8. summary (resumen ejecutivo de la conversación)"""


def _obtener_configuracion_ia(company_id: UUID, db: Session) -> dict:
    # 1. Buscar configuración personalizada del cliente/empresa
    company_cfg = (
        db.query(CompanyAIConfig)
        .filter(CompanyAIConfig.company_id == company_id)
        .first()
    )
    if company_cfg:
        return {
            "model": company_cfg.gemini_model,
            "temperature": float(company_cfg.temperature),
            "prompt": company_cfg.audit_prompt,
        }

    # 2. Si el cliente no tiene configuración propia, buscar valores globales
    global_configs = {c.key: c.value for c in db.query(SystemConfig).all()}
    return {
        "model": global_configs.get("gemini_model", "gemini-1.5-flash"),
        "temperature": float(global_configs.get("temperature", 0.2)),
        "prompt": global_configs.get("audit_prompt", DEFAULT_PROMPT),
    }


async def evaluar_auditoria(
    transcripcion: str,
    nombre_asesor: str,
    company_id: UUID,
    db: Session,
) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY no está configurada en las variables de entorno."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Cargar parámetros configurados para la empresa
    ai_settings = _obtener_configuracion_ia(company_id, db)

    prompt = f"""{ai_settings["prompt"]}

Asesor que atendió la llamada: {nombre_asesor}

Transcripción de la llamada:
\"\"\"{transcripcion}\"\"\"

INSTRUCCIÓN ESTRICTA: Devuelve tu respuesta exclusivamente en formato JSON estructurado válido según los criterios solicitados. No agregues texto introductorio ni explicaciones fuera del JSON.
"""

    response = client.models.generate_content(
        model=ai_settings["model"],
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=ai_settings["temperature"],
        ),
    )

    raw_text = response.text.strip()
    # Limpieza de bloques de código en caso de que el modelo los incluya
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    return json.loads(raw_text.strip())
