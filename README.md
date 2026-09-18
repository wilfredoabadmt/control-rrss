# GAMEA Social Monitor

Plataforma Institucional de Monitoreo y Analítica de Interacciones en Redes Sociales del Gobierno Autónomo Municipal de El Alto (GAMEA).

## Quick Start

```bash
# 1. Clonar repositorio
git clone https://github.com/wilfredoabadmt/control-rrss.git
cd control-rrss

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

| [Guía Rápida (Quickstart)](docs/quickstart.md) | Instalación, configuración y puesta en marcha |
| [Constitución SDD](docs/constitution.md) | Norma suprema del proyecto (40 principios) |
| [Auditoría Constitucional](docs/constitution-check.md) | Matriz de cumplimiento 100% PASS |
| [Especificación Funcional](docs/spec.md) | 14 módulos, 42 requerimientos, 79 reglas |
| [Plan Arquitectónico](docs/plan.md) | Stack, arquitectura modular, modelos de datos |
| [Decisiones de Arquitectura (ADRs)](docs/adr/) | ADR-001 a ADR-006 formales |
| [Tareas de Implementación](docs/tasks.md) | 10 fases, 53 tareas completadas al 100% |
| [Contratos de Interfaz](contracts/) | OpenAPI 3.1 en JSON y YAML (47 rutas) |

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
