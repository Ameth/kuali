import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Probamos los modelos más ligeros y disponibles
modelos = [
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
]

for m in modelos:
    try:
        print(f"Probando {m}...")
        res = client.models.generate_content(
            model=m, contents="Di 'OK' si recibes este mensaje."
        )
        print(f"--> ÉXITO con {m}: {res.text.strip()}")
        break
    except Exception as e:
        print(f"--> Falló {m}: {e}\n")
