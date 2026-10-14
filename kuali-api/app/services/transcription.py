# app/services/transcription.py
import os
import httpx

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")


async def transcribir_audio(file_path: str) -> dict:
    """
    Envía el archivo local a la API REST de Deepgram,
    obtiene la transcripción con diarización y formatea el diálogo.
    """
    if not DEEPGRAM_API_KEY:
        raise ValueError(
            "DEEPGRAM_API_KEY no está configurada en las variables de entorno."
        )

    url = "https://api.deepgram.com/v1/listen"
    params = {
        "model": "nova-2",
        "language": "es",
        "smart_format": "true",
        "diarize": "true",
        "punctuate": "true",
    }
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "audio/wav",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()

        response = await client.post(
            url, params=params, headers=headers, content=audio_bytes
        )

    if response.status_code != 200:
        raise RuntimeError(f"Error Deepgram ({response.status_code}): {response.text}")

    data = response.json()
    channel = data["results"]["channels"][0]["alternatives"][0]
    transcripcion_completa = channel.get("transcript", "")

    # Formatear el diálogo por interlocutores (diarización)
    dialogo = []
    paragraphs = channel.get("paragraphs", {}).get("paragraphs", [])
    if paragraphs:
        for p in paragraphs:
            speaker = f"Hablante {p.get('speaker', 0)}"
            sentences = [s.get("text", "") for s in p.get("sentences", [])]
            texto = " ".join(sentences).strip()
            if texto:
                dialogo.append(f"{speaker}: {texto}")

    texto_formateado = "\n".join(dialogo) if dialogo else transcripcion_completa
    duracion = data.get("metadata", {}).get("duration", 0)

    return {
        "texto_plano": transcripcion_completa,
        "texto_dialogo": texto_formateado,
        "duracion_segundos": int(duracion),
    }
