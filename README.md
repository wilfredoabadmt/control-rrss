# GAMEA Social Monitor

Plataforma Institucional de Monitoreo y Analítica de Interacciones en Redes Sociales del Gobierno Autónomo Municipal de El Alto (GAMEA).

## Quick Start

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd gamea-social-monitor

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar servicios
docker-compose up -d

# 4. Ejecutar migraciones
docker-compose exec api alembic upgrade head

# 5. Crear usuario super admin
docker-compose exec api python -m scripts.seed_dev

# 6. Acceder
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
# Health:   http://localhost:8000/health/liveness
```

## Arquitectura

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + Celery
- **Frontend:** React 19 + TypeScript + Vite
- **Base de Datos:** PostgreSQL 16
- **Broker/Cache:** Redis 7
- **Despliegue:** Docker + Coolify

## Documentación

| Documento | Descripción |
| :--- | :--- |
| [Constitución SDD](docs/constitution.md) | Norma suprema del proyecto |
| [Especificación Funcional](docs/spec.md) | 14 módulos, 42 requerimientos |
| [Plan Arquitectónico](docs/plan.md) | Stack, ADRs, modelo de datos |
| [Tareas](docs/tasks.md) | Desglose de implementación |
| [Investigación APIs](docs/research.md) | Hallazgos de APIs externas |

## Estructura del Proyecto

```
├── backend/          # API FastAPI + módulos de dominio
├── frontend/         # React + TypeScript + Vite
├── alembic/          # Migraciones de base de datos
├── contracts/        # Contratos OpenAPI
├── docs/             # Documentación SDD
├── scripts/          # Scripts de utilidad
└── docker-compose.yml
```

## Licencia

Propiedad del Gobierno Autónomo Municipal de El Alto (GAMEA). Uso interno institucional.
