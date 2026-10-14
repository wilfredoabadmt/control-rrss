import sqlite3, os
p = "gamea_local.db"
print("exists:", os.path.exists(p), "abs:", os.path.abspath(p))
con = sqlite3.connect(p)
cur = con.cursor()
rows = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
names = [r[0] for r in rows]
print("tables:", len(names))
print(names)
print("alembic_version present:", "alembic_version" in names)
cols = [r[1] for r in cur.execute("PRAGMA table_info(users)").fetchall()]
print("users cols:", cols)
cols2 = [r[1] for r in cur.execute("PRAGMA table_info(employees)").fetchall()]
print("employees cols:", cols2)
cols3 = [r[1] for r in cur.execute("PRAGMA table_info(publications)").fetchall()]
print("publications cols:", cols3)
trg = cur.execute("SELECT name FROM sqlite_master WHERE type='trigger'").fetchall()
print("triggers:", trg)
con.close()
