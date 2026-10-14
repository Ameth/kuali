from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models.models
from app.api.pbx import router as pbx_router  # <-- Importar router
from app.api.audits import router as audits_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kuali API",
    description="Motor de Auditoría Inteligente y QA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conectar rutas
app.include_router(pbx_router)
app.include_router(audits_router)

@app.get("/")
def check_status():
    return {"platform": "Kuali", "status": "online", "database": "connected"}
