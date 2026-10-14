# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importación de routers
from app.api.pbx import router as pbx_router
from app.api.audits import router as audits_router
from app.api.agents import router as agents_router

app = FastAPI(
    title="Kuali API",
    version="1.0.0",
    description="Motor de Auditoría Inteligente y QA para Call Centers",
)

# Configuración de CORS para permitir la conexión desde kuali-web (React / Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoint de comprobación básica de estado
@app.get("/", tags=["Estado"])
def check_status():
    return {"status": "online", "service": "Kuali API", "version": "1.0.0"}


# Registro de routers modulares
app.include_router(pbx_router)
app.include_router(audits_router)
app.include_router(agents_router)
