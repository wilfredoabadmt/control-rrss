"""
Pruebas de Salud y Middleware de FastAPI — GAMEA Social Monitor
"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Añadir backend al sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core.pagination import PageResponse
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "GAMEA Social Monitor"
    assert "version" in data
    assert "X-Correlation-ID" in response.headers


def test_health_liveness_endpoint(client):
    response = client.get("/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["service"] == "gamea-social-monitor"
    assert "X-Correlation-ID" in response.headers


def test_correlation_id_propagation(client):
    custom_cid = "test-custom-correlation-id-12345"
    response = client.get("/health/liveness", headers={"X-Correlation-ID": custom_cid})
    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == custom_cid


def test_page_response_helper():
    items = ["item1", "item2", "item3"]
    total = 25
    page = 1
    page_size = 10

    resp = PageResponse.create(items=items, total=total, page=page, page_size=page_size)
    assert resp.items == items
    assert resp.total == 25
    assert resp.page == 1
    assert resp.page_size == 10
    assert resp.pages == 3  # ceil(25 / 10) = 3
