# ADR-005: Despliegue On-Premise con Docker y Plataforma Coolify

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Infraestructura y DevOps GAMEA Social Monitor
- **Contexto Regulatorio:** Principio XXVIII (Compatibilidad Coolify y Autoalojamiento On-Premise)

---

## 1. Contexto y Planteamiento del Problema

El GAMEA requiere que la infraestructura del sistema opere en centros de datos propios o servidores bajo control municipal exclusivo (On-Premise / Soberanía de Datos), evitando dependencias forzadas con servicios propietarios de nubes públicas foráneas. 

La administración de infraestructura debe ser moderna, automatizable y compatible tanto con orquestación estándar basada en `docker-compose` como con paneles de despliegue PaaS de código abierto como **Coolify**.

---

## 2. Decisión

Se adopta una **Arquitectura de Contenedores Docker Multi-Stage** coordinada mediante archivos declarativos `docker-compose.yml` (desarrollo) y `docker-compose.prod.yml` (producción y Coolify):

1. **Estructura de Servicios Contenerizados:**
   - `backend`: Contenedor Python 3.12-slim con compilación multi-stage, usuario no privilegiado (`appuser`), Uvicorn ASGI de producción con 4 workers, y verificación continua mediante endpoint de salud (`HEALTHCHECK` a `/health`).
   - `celery_worker`: Contenedor basado en la misma imagen de backend, ejecutando tareas asíncronas de ingesta, auditoría y respaldos.
   - `celery_beat`: Programador periódico ligero para cron jobs de sincronización y saneamiento de payloads.
   - `frontend`: Contenedor basado en Nginx Alpine sirviendo los activos estáticos compilados de React/TypeScript con compresión Gzip, cabeceras de seguridad y fallback de SPA a `index.html`.
   - `db`: PostgreSQL 16 Alpine con almacenamiento en volúmenes persistentes nombrados y parámetros optimizados de conexiones.
   - `redis`: Redis 7 Alpine configurado con persistencia de instantáneas (RDB) para colas y rate limiting.

2. **Compatibilidad con Coolify:**
   - La configuración de `docker-compose.prod.yml` expone variables de entorno estandarizadas (`${PORT}`, `${APP_ENV}`, `${DATABASE_URL}`), etiquetas de proxy reverso (Traefik/Coolify Proxy) y redes internas aisladas (`gamea_network`).
   - Soporte para webhook triggers de despliegue automático ante commits a la rama principal (`main`).

3. **Seguridad y Endurecimiento:**
   - Ejecución sin privilegios de root en contenedores de aplicación (`USER 1000:1000`).
   - Límites explícitos de recursos (`deploy.resources.limits`) para CPU y memoria en cada contenedor para evitar ataques de denegación de servicio o agotamiento de recursos.
   - Redes Docker internas privadas que aíslan la base de datos y Redis del tráfico público, permitiendo acceso externo únicamente al frontend y al API gateway/backend.

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **Soberanía y Seguridad de Datos:** Toda la información de servidores públicos e interacciones permanece dentro del perímetro controlado del GAMEA.
- **Portabilidad Absoluta:** La aplicación puede levantarse idénticamente en un servidor bare-metal local, máquinas virtuales Proxmox o instancias de prueba en menos de 5 minutos con un solo comando (`docker compose up -d`).
- **Aislamiento de Dependencias:** Cero conflictos entre versiones de paquetes a nivel de sistema operativo anfitrión.

### Consecuencias Negativas y Mitigación:
- **Mantenimiento del Servidor Anfitrión:** El equipo municipal de TI debe administrar parches del sistema operativo anfitrión (Linux Ubuntu Server/Debian) y respaldos físicos del almacenamiento. Mitigado mediante la automatización de respaldos en ADR-006.
