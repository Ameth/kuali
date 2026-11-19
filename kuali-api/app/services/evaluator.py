# app/services/evaluator.py
import os
import json
import asyncio
from uuid import UUID
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.models.models import CompanyAIConfig, SystemConfig

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DEFAULT_PROMPT = """Eres el motor auditor de calidad 'Kuali'. Analiza la transcripción de la llamada entre un asesor y un usuario.
Evalúa con objetividad y devuelve un JSON con las siguientes claves:
1. overall_score (número de 1.0 a 10.0)
2. empathy_score (número de 1.0 a 10.0)
3. script_compliance (booleano true/false)
4. detected_topic (tema, producto o servicio consultado, o null)
5. agent_strengths (lista de fortalezas observadas)
6. areas_for_improvement (lista de oportunidades de mejora)
7. operational_comments (análisis breve del impacto del tiempo de espera y saltos en cola sobre la conversación)
8. summary (resumen ejecutivo de la conversación)"""

DEPRECATED_MODELS = {
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
}


def _obtener_configuracion_ia(company_id: UUID, db: Session) -> dict:
    # 1. Buscar configuración personalizada del cliente/empresa
    company_cfg = (
        db.query(CompanyAIConfig)
        .filter(CompanyAIConfig.company_id == company_id)
        .first()
    )
    if company_cfg:
        model_name = company_cfg.gemini_model
        if not model_name or model_name in DEPRECATED_MODELS:
            model_name = "gemini-3.5-flash-lite"
        return {
            "model": model_name,
            "temperature": float(company_cfg.temperature),
            "prompt": company_cfg.audit_prompt,
        }

    # 2. Si el cliente no tiene configuración propia, buscar valores globales
    global_configs = {c.key: c.value for c in db.query(SystemConfig).all()}
    model_name = global_configs.get("gemini_model", "gemini-3.5-flash-lite")
    if not model_name or model_name in DEPRECATED_MODELS:
        model_name = "gemini-3.5-flash-lite"

    return {
        "model": model_name,
        "temperature": float(global_configs.get("temperature", 0.2)),
        "prompt": global_configs.get("audit_prompt", DEFAULT_PROMPT),
    }


def _formatear_telemetria(saltos_cola: Optional[List[Dict[str, Any]]]) -> str:
    if not saltos_cola:
        return "No se registró traza previa de cola para esta llamada."

    lineas = []
    for s in saltos_cola:
        evento = s.get("event_type")
        agente = s.get("agent_name") or "Sin asesor"
        espera = s.get("wait_time_seconds", 0)
        ring_s = (s.get("ring_duration_ms") or 0) // 1000

        if evento == "ENTERQUEUE":
            lineas.append("- Ingreso a cola: Cliente en espera.")
        elif evento == "RINGNOANSWER":
            lineas.append(
                f"- Timbrado omitido: Timbró {ring_s}s a {agente} y no contestó."
            )
        elif evento == "CONNECT":
            lineas.append(
                f"- Conectada: {agente} contestó tras {espera}s de espera acumulada."
            )
        elif evento in ["COMPLETECALLER", "COMPLETEAGENT"]:
            lineas.append(
                f"- Fin de llamada: {s.get('talk_time_seconds', 0)}s de conversación."
            )
        elif evento == "ABANDON":
            lineas.append(f"- Abandono: El cliente colgó tras {espera}s de espera.")
        elif evento == "EXITWITHTIMEOUT":
            lineas.append("- Desborde por tiempo de espera en cola.")

    return "\n".join(lineas) if lineas else "Sin eventos relevantes en cola."


async def evaluar_auditoria(
    transcripcion: str,
    nombre_asesor: str,
    company_id: UUID,
    db: Session,
    saltos_cola: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY no está configurada en las variables de entorno."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    # 1. Cargar el prompt y parámetros configurados para la empresa
    ai_settings = _obtener_configuracion_ia(company_id, db)

    # 2. Formatear la telemetría de cola en lenguaje comprensible
    traza_texto = _formatear_telemetria(saltos_cola)

    prompt = f"""{ai_settings["prompt"]}

DATOS OPERATIVOS DE COLA (TELEMETRÍA PREVIA A LA ATENCIÓN):
{traza_texto}

Asesor que atendió la llamada: {nombre_asesor}

Transcripción de la llamada:
\"\"\"{transcripcion}\"\"\"

INSTRUCCIÓN TÉCNICA:
- Considera en la evaluación si el cliente venía de una espera prolongada o si hubo asesores que omitieron el timbrado antes de ser atendido.
- Devuelve tu respuesta exclusivamente en formato JSON estructurado válido según los criterios solicitados. No incluyas texto introductorio ni bloques de formato markdown fuera del JSON.
"""

    modelos_unicos = list(
        dict.fromkeys(
            [
                ai_settings["model"],
                "gemini-3.5-flash-lite",
                "gemini-3.8-flash",
                "gemini-flash-lite-latest",
            ]
        )
    )
    ultimo_error = None

    for intento in range(2):
        for model_name in modelos_unicos:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=ai_settings["temperature"],
                        ),
                    ),
                    timeout=20.0,
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                resultado = json.loads(raw_text.strip())
                print(
                    f"[OK] Auditoría evaluada exitosamente con {model_name} (Score: {resultado.get('overall_score')})"
                )
                return resultado
            except Exception as err:
                ultimo_error = err
                print(f"[~] Reintentando tras fallo en {model_name}: {err}")
                await asyncio.sleep(1.5)

    raise ultimo_error