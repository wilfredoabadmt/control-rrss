import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Añadir backend al path para importar modelos y configuración
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from config import settings
from database import Base

# Importar TODOS los modelos para que su metadata quede registrada en Base
# (sin esto, `alembic check`/`--autogenerate` vería una base vacía y propondría
# borrar todas las tablas).
import importlib

for _name in (
    "core.audit.models",
    "modules.employees.models",
    "modules.iam.models",
    "modules.interactions.models",
    "modules.monitoring.models",
    "modules.publications.models",
    "modules.reporting.models",
    "modules.social_accounts.models",
    "modules.verification.models",
):
    importlib.import_module(_name)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database URL dynamically from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Alembic crea "version_num" como VARCHAR(32), pero los identificadores de
        # revisión de este proyecto (ej. 0005_interactions_and_verifications) lo superan.
        connection.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS alembic_version "
            "(version_num VARCHAR(64) NOT NULL PRIMARY KEY)"
        )
        if connection.dialect.name == "postgresql":
            connection.exec_driver_sql(
                "ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)"
            )
        # El DDL previo inicia una transacción; hay que cerrarla para que Alembic
        # pueda tomar el control y confirmar la migración (si no, se hace rollback).
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
