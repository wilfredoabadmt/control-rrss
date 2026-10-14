import warnings, py_compile, sys
warnings.simplefilter("error")
try:
    py_compile.compile("alembic/versions/0008_column_comments.py", doraise=True)
    print("0008 compiled without warning (with -W error)")
except Exception as e:
    print("0008 compile issue:", type(e).__name__, e)

# index uniqueness check on employees.document_hash via create_all on sqlite
sys.path.insert(0, "backend")
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from database import Base
import core.audit.models, modules.iam.models, modules.employees.models  # noqa
import modules.social_accounts.models, modules.publications.models, modules.interactions.models  # noqa
import modules.verification.models, modules.reporting.models, modules.monitoring.models  # noqa

async def main():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with eng.connect() as conn:
        rows = (await conn.exec_driver_sql("PRAGMA index_list('employees')")).fetchall()
        for r in rows:
            # r: seq, name, unique, origin, partial
            print("employees index:", r[1], "unique=", r[2])
        rows2 = (await conn.exec_driver_sql("PRAGMA index_list('audit_events')")).fetchall()
        print("audit_events indexes:", [(r[1], r[2]) for r in rows2])
    await eng.dispose()

asyncio.run(main())
