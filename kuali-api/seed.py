# kuali-api/seed.py
import secrets
from app.core.database import SessionLocal
from app.models.models import Company, PBXIntegration, Agent

def poblar_datos_iniciales():
    db = SessionLocal()
    try:
        # 1. Crear o verificar la empresa Centro Inca
        empresa = db.query(Company).filter(Company.name == "Centro Inca").first()
        if not empresa:
            empresa = Company(
                name="Centro Inca",
                is_active=True,
                audit_percentage=100  # Auditar el 100% por defecto (configurable)
            )
            db.add(empresa)
            db.commit()
            db.refresh(empresa)
            print(f"[+] Empresa creada: {empresa.name} (ID: {empresa.id})")
        else:
            print(f"[*] Empresa existente: {empresa.name} (ID: {empresa.id})")

        # 2. Crear API Key para el servidor Issabel del Centro Inca
        pbx = db.query(PBXIntegration).filter(PBXIntegration.company_id == empresa.id).first()
        if not pbx:
            token_seguro = f"kuali_live_{secrets.token_hex(24)}"
            pbx = PBXIntegration(
                company_id=empresa.id,
                name="Issabel PBX Principal",
                api_key=token_seguro,
                is_active=True
            )
            db.add(pbx)
            db.commit()
            db.refresh(pbx)
            print(f"[+] Integración PBX creada exitosamente.")
            print(f"============================================================")
            print(f" TU API KEY PARA PROBAR: {pbx.api_key}")
            print(f"============================================================")
        else:
            print(f"[*] Integración PBX ya existe.")
            print(f"============================================================")
            print(f" TU API KEY EXISTENTE: {pbx.api_key}")
            print(f"============================================================")

        # 3. Registrar asesores iniciales basados en las llamadas reales
        asesores_demo = [
            {"extension": "1690", "name": "Julis Lozano", "default_queue": "919"},
            {"extension": "1693", "name": "Edilsa", "default_queue": "919"},
            {"extension": "1631", "name": "Asesor Admisiones 1", "default_queue": "919"},
        ]

        for item in asesores_demo:
            agente_existente = db.query(Agent).filter(
                Agent.company_id == empresa.id,
                Agent.extension == item["extension"]
            ).first()

            if not agente_existente:
                nuevo_agente = Agent(
                    company_id=empresa.id,
                    extension=item["extension"],
                    name=item["name"],
                    default_queue=item["default_queue"],
                    is_active=True
                )
                db.add(nuevo_agente)
                print(f"[+] Asesor registrado: Ext. {item['extension']} - {item['name']}")

        db.commit()
        print("\n[OK] Datos del Centro Inca cargados exitosamente en Supabase.")

    except Exception as e:
        db.rollback()
        print(f"[!] Error al cargar datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    poblar_datos_iniciales()