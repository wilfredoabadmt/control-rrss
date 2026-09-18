"""
Pruebas de Auditoría Inmutable — GAMEA Social Monitor
Principio X: Registro de Auditoría Inmutable (Append-Only)
"""

import uuid

import pytest
from core.audit.models import AuditEvent
from database import Base
from modules.shared.enums import AuditAction
from modules.shared.exceptions import ImmutableAuditException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def sqlite_session():
    """Configura base de datos SQLite en memoria para pruebas de auditoría."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_audit_event_creation(sqlite_session):
    """Verifica creación correcta de un evento de auditoría."""
    event = AuditEvent(
        id=uuid.uuid4(),
        action=AuditAction.CREATE.value,
        entity_name="User",
        entity_id=str(uuid.uuid4()),
        user_email="admin@elalto.gob.bo",
        correlation_id="corr-12345-audit-test",
        new_state={"email": "newuser@elalto.gob.bo"},
    )
    sqlite_session.add(event)
    sqlite_session.commit()

    saved = sqlite_session.query(AuditEvent).filter_by(id=event.id).first()
    assert saved is not None
    assert saved.action == "CREATE"
    assert saved.entity_name == "User"
    assert saved.correlation_id == "corr-12345-audit-test"


def test_audit_event_immutability_before_update(sqlite_session):
    """
    Principio X: Modificar un registro de auditoría DEBE lanzar ImmutableAuditException.
    """
    event = AuditEvent(
        id=uuid.uuid4(),
        action=AuditAction.LOGIN.value,
        entity_name="User",
        entity_id=str(uuid.uuid4()),
        correlation_id="corr-immutability-update-test",
    )
    sqlite_session.add(event)
    sqlite_session.commit()

    # Intentar modificar el registro
    event.action = "ALTERED_ACTION"
    with pytest.raises(ImmutableAuditException) as excinfo:
        sqlite_session.commit()

    assert "inmutabilidad" in str(excinfo.value).lower()


def test_audit_event_immutability_before_delete(sqlite_session):
    """
    Principio X: Eliminar un registro de auditoría DEBE lanzar ImmutableAuditException.
    """
    event = AuditEvent(
        id=uuid.uuid4(),
        action=AuditAction.DELETE.value,
        entity_name="User",
        entity_id=str(uuid.uuid4()),
        correlation_id="corr-immutability-delete-test",
    )
    sqlite_session.add(event)
    sqlite_session.commit()

    # Intentar eliminar el registro
    sqlite_session.delete(event)
    with pytest.raises(ImmutableAuditException) as excinfo:
        sqlite_session.commit()

    assert "inmutabilidad" in str(excinfo.value).lower()
