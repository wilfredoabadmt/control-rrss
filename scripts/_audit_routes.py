"""Inventario temporal de rutas y verificacion de autenticacion (uso interno de auditoria).

Este script no forma parte del producto: se usa para evidenciar que endpoints
carecen de dependencia de autenticacion/autorizacion.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from main import app  # noqa: E402

AUTH_MARKERS = ("get_current_user", "role_checker", "permission_checker")


def dep_names(dep, acc):
    for d in dep.dependencies:
        acc.append(getattr(d.call, "__name__", str(d.call)))
        dep_names(d, acc)
    return acc


records: list[dict] = []


def walk(routes, prefix=""):
    if not routes:
        return
    for r in routes:
        tn = type(r).__name__
        if tn == "_IncludedRouter":
            ctx = getattr(r, "include_context", None)
            sub_prefix = getattr(ctx, "prefix", "") or ""
            walk(getattr(r.original_router, "routes", None), prefix + sub_prefix)
        elif hasattr(r, "routes") and not hasattr(r, "endpoint"):
            walk(getattr(r, "routes", None) or [], prefix)
        else:
            path = prefix + (getattr(r, "path", "") or "")
            methods = sorted(set(getattr(r, "methods", []) or []) - {"HEAD"})
            dep = getattr(r, "dependant", None)
            names = [n for n in (dep_names(dep, []) if dep else []) if n != "get_async_db"]
            records.append({"path": path, "methods": methods, "deps": names})


walk(app.routes)
records.sort(key=lambda x: (x["path"], x["methods"]))

api = [r for r in records if r["path"].startswith("/api")]
print(f"ENDPOINTS /api: {len(api)}")
print()
print(f"{'MET':7} {'PATH':52} {'AUTH':10} DEPS")
for e in api:
    auth = "AUTH" if any(n in AUTH_MARKERS for n in e["deps"]) else "NO-AUTH!!"
    print(f"{','.join(e['methods']):7} {e['path']:52} {auth:10} {'|'.join(e['deps'])}")

print()
print("=== ENDPOINTS SIN AUTENTICACION ===")
unauth = [e for e in api if not any(n in AUTH_MARKERS for n in e["deps"])]
for e in unauth:
    print("  ", ",".join(e["methods"]), e["path"])
print("TOTAL SIN AUTH:", len(unauth))

print()
print("=== ENDPOINTS SIN RBAC (autenticados pero sin require_roles/permissions) ===")
weak = [
    e
    for e in api
    if any(n in ("get_current_user",) for n in e["deps"])
    and not any(n in ("role_checker", "permission_checker") for n in e["deps"])
]
for e in weak:
    print("  ", ",".join(e["methods"]), e["path"])
print("TOTAL SOLO AUTENTICADO:", len(weak))

schema = app.openapi()
print()
print("OPENAPI PATHS:", len(schema.get("paths", {})))
print("OPENAPI OPERATIONS:", sum(len(v) for v in schema["paths"].values()))
