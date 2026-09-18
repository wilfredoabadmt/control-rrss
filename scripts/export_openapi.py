"""
Export OpenAPI 3.1 contract specification to JSON and YAML formats.
Execution: python scripts/export_openapi.py
"""
import json
import sys
from pathlib import Path
import yaml

# Ensure backend is in python path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from main import app  # noqa: E402


def export_openapi():
    contracts_dir = Path(__file__).resolve().parent.parent / "contracts"
    contracts_dir.mkdir(parents=True, exist_ok=True)

    schema = app.openapi()

    json_path = contracts_dir / "openapi.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    yaml_path = contracts_dir / "openapi.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(schema, f, allow_unicode=True, sort_keys=False)

    print(f"✅ OpenAPI specification exported successfully to {contracts_dir}")
    print(f"   - JSON: {json_path} ({len(schema.get('paths', {}))} paths)")
    print(f"   - YAML: {yaml_path}")


if __name__ == "__main__":
    export_openapi()
