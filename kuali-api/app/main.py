# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importación de routers
from app.api.auth import router as auth_router
from app.api.pbx import router as pbx_router
from app.api.audits import router as audits_router
from app.api.agents import router as agents_router
from app.api.admin import router as admin_router

__version__ = "1.2.0"

app = FastAPI(
    title="Kuali API",
    version=__version__,
    description="Motor de Auditoría Inteligente y QA para Call Centers",
)

# Permitir conexiones desde Vite (kuali-web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Estado"])
def check_status():
    return {"status": "online", "service": "Kuali API", "version": __version__}


# Registro modular de routers
app.include_router(auth_router)
app.include_router(pbx_router)
app.include_router(audits_router)
app.include_router(agents_router)
app.include_router(admin_router)
