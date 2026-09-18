# GAMEA Social Monitor — Guía Rápida de Instalación y Despliegue (Quickstart)

Bienvenido a la guía de inicio rápido para **GAMEA Social Monitor**, la plataforma institucional de monitoreo y analítica de redes sociales del Gobierno Autónomo Municipal de El Alto (GAMEA).

---

## 1. Requisitos Previos del Sistema

Asegúrese de contar con las siguientes herramientas instaladas en su entorno:

- **Python:** Versión 3.12 o superior.
- **Node.js:** Versión 20 LTS o superior y gestor de paquetes `npm`.
- **PostgreSQL:** Versión 16 o superior con soporte para UUID y extensiones criptográficas.
- **Redis:** Versión 7 o superior (requerido para cola de mensajería Celery y Rate Limiting).
- **Docker & Docker Compose:** (Opcional, para ejecución contenerizada recomendada en producción/Coolify).
- **Git:** Para control de versiones.

---

## 2. Configuración del Entorno de Desarrollo Local

### 2.1. Clonar el Repositorio

```bash
git clone https://github.com/GAMEA/control-rrss.git
cd "Control RRSS"
```

### 2.2. Variables de Entorno

Copie el archivo de plantilla `.env.example` hacia `.env`:

```bash
cp .env.example .env
```

Genere claves criptográficas seguras para `SECRET_KEY` (JWT) y `ENCRYPTION_KEY` (Fernet AES-256):

```bash
# Generar clave JWT
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generar clave Fernet AES-256
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Actualice los valores en su archivo `.env`:

```env
APP_ENV=development
SECRET_KEY=su_clave_jwt_generada
ENCRYPTION_KEY=su_clave_fernet_generada
BLIND_INDEX_SALT=su_sal_aleatoria_para_hmac
DATABASE_URL=postgresql+asyncpg://gamea_user:gamea_secret@localhost:5432/gamea_monitor
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 3. Configuración del Backend (FastAPI + Alembic)

### 3.1. Entorno Virtual de Python

```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno virtual
# En Windows (PowerShell):
.venv\Scripts\Activate.ps1
# En Linux/macOS:
source .venv/bin/activate

# Instalar dependencias del proyecto
pip install --upgrade pip
pip install -e ".[dev]"
```

### 3.2. Migraciones de Base de Datos

Ejecute las migraciones de Alembic para crear el esquema relacional con soporte de auditoría inmutable:

```bash
alembic upgrade head
```

### 3.3. Sembrado de Datos Iniciales (Superadmin y Plataformas)

Para inicializar las plataformas sociales canónicas y el usuario superadministrador:

```bash
python scripts/seed_admin.py
```

*Credenciales por defecto de entorno de desarrollo:*
- **Usuario / Email:** `admin@elalto.gob.bo`
- **Contraseña:** `AdminGamea2026!`
- **Rol:** `superadmin`

> **ADVERTENCIA:** Cambie inmediatamente la contraseña en entornos de producción mediante la consola administrativa o el comando seguro.

---

## 4. Servicios en Segundo Plano (Celery Worker & Beat)

Abra terminales independientes para ejecutar los procesos asíncronos de ingesta y reconciliación:

### 4.1. Celery Worker

```bash
celery -A backend.core.celery_app.celery_app worker --loglevel=info --concurrency=4
```

### 4.2. Celery Beat (Programador de Tareas Recurrentes)

```bash
celery -A backend.core.celery_app.celery_app beat --loglevel=info
```

---

## 5. Ejecución del Servidor Backend

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- **API Base:** `http://localhost:8000/api/v1`
- **Documentación Swagger UI:** `http://localhost:8000/docs`
- **Documentación ReDoc:** `http://localhost:8000/redoc`

---

## 6. Configuración y Ejecución del Frontend (React + Vite)

En otra terminal, acceda al directorio `frontend`:

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Hot Module Replacement (Vite)
npm run dev
```

- **Acceso a la Interfaz Web:** `http://localhost:5173`

---

## 7. Despliegue Rápido con Docker Compose (Recomendado)

Si prefiere levantar toda la arquitectura de servicios (Postgres 16, Redis 7, Backend, Worker, Beat y Frontend) en contenedores Docker:

### 7.1. Entorno de Producción / Staging

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esto desplegará los siguientes servicios con políticas de reinicio `unless-stopped` y límites de memoria:
- `db`: PostgreSQL 16 en el puerto `5432` con volumen persistente `postgres_data`.
- `redis`: Redis 7 en el puerto `6379` con volumen persistente `redis_data`.
- `backend`: FastAPI Uvicorn ASGI en el puerto `8000` con healthcheck `/health`.
- `celery_worker`: Procesamiento de tareas de ingesta, auditoría y backups.
- `celery_beat`: Cron programador de tareas periódicas.
- `frontend`: Servidor Nginx estático optimizado en el puerto `80` sirviendo el bundle React.

Para verificar el estado de los contenedores:

```bash
docker compose -f docker-compose.prod.yml ps
```

Para visualizar los registros en tiempo real:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 8. Verificación y Pruebas de Calidad

### 8.1. Pruebas Unitarias y de Integración Backend

```bash
pytest backend/tests/ -v
```

Debe validar que las 58 pruebas unitarias pasen sin errores, cubriendo:
- Autenticación IAM y RBAC.
- PII y Cifrado con Blind Indexing.
- Tabla inmutable de Auditoría (Append-only).
- Categorización epistémica de interacciones (Principio V).
- Reconciliación idempotente de nómina institucional.
- Seguridad OWASP, Rate Limiting y Cabeceras HTTP seguras.

### 8.2. Verificación de Tipos y Compilación Frontend

```bash
cd frontend
npm run build
```

Asegura compilación TypeScript estricta con Vite y generación de artefactos estáticos en `frontend/dist/`.

---

## 9. Monitoreo y Respaldos Automatizados

El sistema incluye respaldos diarios automáticos con cómputo de resumen SHA-256 e inyección de registro en la tabla inmutable de auditoría:

Para disparar un respaldo manual inmediato vía CLI:

```bash
python -c "from backend.modules.shared.backup import DatabaseBackupService; print(DatabaseBackupService().create_backup())"
```

Los respaldos se almacenan de forma segura en `backups/` y quedan registrados permanentemente en la bitácora de auditoría.
