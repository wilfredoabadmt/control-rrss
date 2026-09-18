# ADR-001: Adopción de Arquitectura Modular Monolith

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Arquitectura GAMEA Social Monitor
- **Contexto Regulatorio:** Principio I (Modular Monolith Obligatorio), Principio VII (Cero Código Muerto)

---

## 1. Contexto y Planteamiento del Problema

El Gobierno Autónomo Municipal de El Alto (GAMEA) requiere una plataforma integral de monitoreo, analítica y verificación de redes sociales institucionales. El sistema debe gestionar:
- Directorio de funcionarios y vinculación a cuentas de redes sociales.
- Ingesta asíncrona de publicaciones e interacciones (likes, comentarios, compartidos).
- Verificación epistémica y categorización con trazabilidad estricta.
- Generación de reportes analíticos e indicadores institucionales.
- Auditoría inmutable de todas las operaciones del sistema.

Las alternativas arquitectónicas consideradas fueron:
1. **Arquitectura de Microservicios Distribuidos:** Servicios independientes por dominio (Auth Service, Employee Service, Scraping Service, Analytics Service).
2. **Monolito Tradicional Acoplado:** Todo el código en un único paquete sin fronteras claras entre módulos.
3. **Monolito Modular (Modular Monolith):** Una única base de código y unidad de despliegue con módulos de dominio estrictamente desacoplados, interfaces claras y base de datos relacional compartida gobernada por esquemas/tablas por módulo.

---

## 2. Decisión

Se decide implementar una **Arquitectura de Monolito Modular (Modular Monolith)** utilizando **FastAPI (Python 3.12)** en el backend y **React 18 + TypeScript + Vite** en el frontend, respaldado por **PostgreSQL 16** y **Redis/Celery**.

### Principios de Implementación:
- Cada módulo de dominio reside en `backend/modules/<nombre_modulo>/` y contiene sus propios modelos SQLAlchemy, esquemas Pydantic, servicios de lógica de negocio y enrutadores API.
- La comunicación entre módulos se realiza exclusivamente mediante servicios de dominio o eventos en memoria/Celery, evitando dependencias circulares y llamadas directas de bajo nivel no controladas.
- La base de datos es única pero segmentada conceptualmente por prefijos y relaciones de claves foráneas transparentes.
- El despliegue se gestiona como una sola unidad atómica en contenedores Docker, simplificando operaciones, monitoreo y respaldo.

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **Simplicidad Operativa:** Sin sobrecarga de red interservicio (RPC, gRPC o HTTP interno), sin necesidad de service mesh o transacciones distribuidas (Saga/2PC).
- **Consistencia Transaccional ACID:** Capacidad de ejecutar transacciones relacionales atómicas garantizadas por PostgreSQL (crucial para auditoría y nómina).
- **Facilidad de Desarrollo y Refactorización:** Pruebas unitarias de integración rápidas en memoria (SQLite/Postgres) sin levantar múltiples servidores mock.
- **Preparado para Escala:** Si en el futuro un módulo específico (como la ingesta asíncrona masiva de adaptadores) requiere escalado independiente, la frontera modular permite extraerlo a un microservicio sin reescribir la lógica de negocio.

### Consecuencias Negativas y Mitigación:
- **Riesgo de Acoplamiento Implícito:** Mitigado mediante linters de arquitectura (Ruff, Mypy) y revisiones estrictas de dependencias entre módulos.
- **Punto Único de Despliegue:** Mitigado mediante pruebas automatizadas rigurosas en CI/CD y pipelines de despliegue sin tiempo de inactividad con Docker Compose / Coolify.
