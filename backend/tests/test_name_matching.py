"""
Pruebas del cotejo difuso de nombres — GAMEA Social Monitor
Valida el cruce entre los nombres copiados del diálogo de reacciones de Facebook
y el padrón municipal de funcionarios (nombres compuestos, acentos y ambigüedad).
"""

import pytest
from modules.shared.name_matching import (
    best_employee_match,
    name_tokens,
    normalize_name,
    score_candidate,
)

EMPLOYEES = [
    {"first_name": "William Rodolfo", "last_name": "Choque Mamani"},
    {"first_name": "Pamela", "last_name": "Arce Trujillo"},
    {"first_name": "Patricia", "last_name": "Flores Callisaya"},
    {"first_name": "Gonzalo", "last_name": "Aruquipa Mamani"},
    {"first_name": "Ana", "last_name": "Lopez Flores"},
    {"first_name": "Ana", "last_name": "Lopez Quispe"},
    {"first_name": "José", "last_name": "Mamani Condori"},
]


def test_normalize_and_tokens():
    assert normalize_name("  José  Mamani ") == "josemamani"
    assert name_tokens("José, Mamani") == ["jose", "mamani"]
    assert normalize_name(None) == ""
    assert name_tokens("") == []


def test_exact_full_name_match():
    res = best_employee_match("Pamela Arce Trujillo", EMPLOYEES)
    assert res.matched is True
    assert res.employee["first_name"] == "Pamela"
    assert res.reason == "EXACT"
    assert res.score == 1.0


def test_accent_insensitive_match():
    res = best_employee_match("Jose Mamani Condori", EMPLOYEES)
    assert res.matched is True
    assert res.reason == "EXACT"


def test_compound_first_name_with_single_surname():
    res = best_employee_match("William Choque", EMPLOYEES)
    assert res.matched is True
    assert res.employee["first_name"] == "William Rodolfo"
    assert res.reason in ("EXACT", "TOKENS")


def test_candidate_with_extra_given_name():
    res = best_employee_match("William R Choque Mamani", EMPLOYEES)
    assert res.matched is True
    assert res.employee["first_name"] == "William Rodolfo"


def test_first_name_plus_two_surnames_subset():
    res = best_employee_match("Pamela Arce", EMPLOYEES)
    assert res.matched is True
    assert res.employee["last_name"] == "Arce Trujillo"


def test_different_first_name_is_not_matched():
    res = best_employee_match("María Flores Callisaya", EMPLOYEES)
    assert res.matched is False
    assert res.reason == "NONE"


def test_unrelated_citizen_name_is_not_matched():
    res = best_employee_match("Luis Fernando Quispe Ramos", EMPLOYEES)
    assert res.matched is False
    assert res.reason == "NONE"


def test_ambiguous_name_reports_ambiguity_instead_of_guessing():
    res = best_employee_match("Ana Lopez", EMPLOYEES)
    assert res.matched is False
    assert res.reason == "AMBIGUOUS"


def test_low_similarity_is_below_threshold():
    emp = {"first_name": "Patricia", "last_name": "Flores Callisaya"}
    assert score_candidate("Patricia Callisaya Ramírez", emp) >= 0.75
    assert score_candidate("Patricia Ejemplo", emp) < 0.75


@pytest.mark.parametrize("candidate,expected_first", [
    ("Gonzalo Aruquipa", "Gonzalo"),
    ("gonzalo aruquipa mamani", "Gonzalo"),
    ("GONZALO ARUIPA", None),
])
def test_variants_of_gonzalo(candidate, expected_first):
    res = best_employee_match(candidate, EMPLOYEES)
    if expected_first is None:
        assert res.matched is False
    else:
        assert res.matched is True
        assert res.employee["first_name"] == expected_first


def test_hypocoristics_and_inverted_names():
    pool = [
        {"first_name": "Marco Antonio", "last_name": "Patzi Sullca"},
        {"first_name": "Roger Armando", "last_name": "Sanchez Herrera"},
        {"first_name": "Rosario", "last_name": "Arteaga Chambi"},
    ]
    # Mark Patzi -> Marco Antonio Patzi Sullca
    m1 = best_employee_match("Mark Patzi", pool)
    assert m1.matched is True
    assert m1.employee["first_name"] == "Marco Antonio"

    # Sanchez Armando -> Roger Armando Sanchez Herrera (Inverted + subset)
    m2 = best_employee_match("Sanchez Armando", pool)
    assert m2.matched is True
    assert m2.employee["last_name"] == "Sanchez Herrera"

    # Chayito Ros AC. -> Rosario Arteaga Chambi (Hypocoristic + acronym)
    m3 = best_employee_match("Chayito Ros AC.", pool)
    assert m3.matched is True
    assert m3.employee["first_name"] == "Rosario"

