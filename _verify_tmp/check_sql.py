import sys
sys.path.insert(0, "backend")
from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from core.audit.models import AuditEvent

q = select(AuditEvent).order_by(AuditEvent.timestamp_utc.desc()).limit(5000)
q = q.where(AuditEvent.action == "DELETE")
q = q.where(AuditEvent.timestamp_utc >= __import__("datetime").datetime(2025, 1, 1))
print(str(q.compile(dialect=postgresql.dialect())))
