import os
import shutil
from datetime import datetime
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
)
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Company, PBXIntegration, Agent, Audit
from app.services.transcription import transcribir_audio
from app.services.evaluator import evaluar_auditoria

router = APIRouter(prefix="/api/v1/pbx", tags=["PBX Integration"])

UPLOAD_DIR = "temp_audios"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_call(
    x_api_key: str = Header(..., description="API Key configurada en Issabel"),
    audio: UploadFile = File(..., description="Archivo .wav de la llamada"),
    uniqueid: str = Form(...),
    queue: str = Form(None),
    customer_phone: str = Form(None),
    agent_extension: str = Form(None),
    call_date: str = Form(...),
    duration_seconds: int = Form(0),
    db: Session = Depends(get_db),
):
    # 1. Validar autenticación de la PBX
    pbx = (
        db.query(PBXIntegration)
        .filter(PBXIntegration.api_key == x_api_key, PBXIntegration.is_active == True)
        .first()
    )

    if not pbx:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida o PBX inactiva",
        )

    company_id = pbx.company_id

    # 2. Evitar procesar duplicados
    audit_existente = (
        db.query(Audit)
        .filter(Audit.company_id == company_id, Audit.uniqueid == uniqueid)
        .first()
    )

    if audit_existente:
        return {
            "status": "skipped",
            "message": "Llamada ya registrada",
            "audit_id": str(audit_existente.id),
        }

    # 3. Buscar asesor por extensión
    agent = None
    if agent_extension:
        agent = (
            db.query(Agent)
            .filter(
                Agent.company_id == company_id, Agent.extension == str(agent_extension)
            )
            .first()
        )

    # 4. Parsear fecha
    try:
        parsed_date = datetime.strptime(call_date, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        parsed_date = datetime.utcnow()

    # 5. Guardar audio temporalmente en disco
    file_path = os.path.join(UPLOAD_DIR, f"{uniqueid}_{audio.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    # 6. Transcribir con Deepgram y auto-eliminar el archivo
    texto_transcrito = ""
    duracion_real = duration_seconds
    try:
        resultado_stt = await transcribir_audio(file_path)
        texto_transcrito = resultado_stt["texto_dialogo"]
        if duracion_real == 0:
            duracion_real = int(resultado_stt["duracion_segundos"])
    except Exception as e:
        print(f"[!] Error al transcribir con Deepgram: {e}")
        texto_transcrito = "Error en transcripción"
    finally:
        # LIMPIEZA INMEDIATA: No dejamos el archivo .wav ocupando espacio
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[x] Archivo temporal eliminado: {file_path}")

    # 7. Evaluar con Gemini si la transcripción fue exitosa
    analisis_json = None
    overall_score = None
    empathy_score = None
    script_compliance = None
    detected_program = None

    if texto_transcrito and texto_transcrito != "Error en transcripción":
        try:
            nombre_agente = agent.name if agent else "Asesor"
            analisis_json = await evaluar_auditoria(texto_transcrito, nombre_agente)

            overall_score = analisis_json.get("overall_score")
            empathy_score = analisis_json.get("empathy_score")
            script_compliance = analisis_json.get("script_compliance")
            detected_program = analisis_json.get("detected_program")
            estado_final = "completed"
        except Exception as err:
            print(f"[!] Error al evaluar con Gemini: {err}")
            estado_final = "transcribed"
    else:
        estado_final = "failed"

    # 8. Guardar en base de datos
    nueva_auditoria = Audit(
        company_id=company_id,
        agent_id=agent.id if agent else None,
        uniqueid=uniqueid,
        queue=queue,
        customer_phone=customer_phone,
        call_date=parsed_date,
        duration_seconds=duracion_real,
        audio_url=None,
        transcription=texto_transcrito,
        analysis_result=analisis_json,
        overall_score=overall_score,
        empathy_score=empathy_score,
        script_compliance=script_compliance,
        detected_program=detected_program,
        status=estado_final,
    )

    db.add(nueva_auditoria)
    db.commit()
    db.refresh(nueva_auditoria)

    return {
        "status": "success",
        "message": "Llamada procesada y transcrita exitosamente",
        "audit_id": str(nueva_auditoria.id),
        "agent": agent.name if agent else "No asignado",
        "transcription_preview": (
            texto_transcrito[:150] + "..."
            if len(texto_transcrito) > 150
            else texto_transcrito
        ),
        "next_step": "Listo para evaluación con LLM",
    }
