"""
GAMEA Social Monitor — Root Application Entrypoint
Permite la ejecución unificada y autodetección en Coolify, Railpack, Nixpacks, Heroku, Docker y desarrollo local.
"""
import importlib.util
import os
import sys
from pathlib import Path

# Agregar el directorio 'backend' a sys.path para resolución de módulos de dominio
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Carga explícita del módulo backend/main.py para evitar colisión circular con root main.py
backend_main_path = BACKEND_DIR / "main.py"
spec = importlib.util.spec_from_file_location("backend_main", backend_main_path)
if spec is None or spec.loader is None:
    raise ImportError(f"No se pudo cargar el archivo principal en {backend_main_path}")

backend_main = importlib.util.module_from_spec(spec)
sys.modules["backend_main"] = backend_main
spec.loader.exec_module(backend_main)

# Exponer la instancia principal de FastAPI
app = backend_main.app

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", os.environ.get("BACKEND_PORT", 3000)))
    host = os.environ.get("HOST", os.environ.get("BACKEND_HOST", "0.0.0.0"))
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
