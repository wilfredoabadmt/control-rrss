"""
Cotejo difuso de nombres de funcionarios — GAMEA Social Monitor
Principio VII (Cotejo Robusto de Identidades), REQ-INT-003, BR-INT-006..009

Los nombres copiados del diálogo de reacciones de Facebook no coinciden literalmente
con el padrón municipal (nombres compuestos, un solo apellido, acentos, mayúsculas,
apellidos invertidos). Este módulo puntúa cada candidato contra el padrón y devuelve
siempre una decisión conservadora: si dos funcionarios empatan prácticamente igual,
prefiere reportar AMBIGUOUS antes que atribuir la actividad a la persona equivocada.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

MATCH_THRESHOLD = 0.75
AMBIGUITY_MARGIN = 0.05
FUZZY_MARGIN = 0.02


def normalize_name(text: str | None) -> str:
    """Normaliza un nombre sin acentos, en minúsculas y sin separadores."""
    if not text:
        return ""
    norm = unicodedata.normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9]", "", norm.lower().strip())


def name_tokens(text: str | None) -> list[str]:
    """Extrae los tokens alfanuméricos de un nombre en minúsculas y sin acentos."""
    if not text:
        return []
    norm = unicodedata.normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("utf-8")
    return [t for t in re.split(r"[^a-z0-9]+", norm.lower()) if t]


@dataclass(frozen=True)
class NameMatchResult:
    """Resultado del cotejo de un nombre candidato contra el padrón de funcionarios."""

    employee: Any | None
    score: float
    reason: str

    @property
    def matched(self) -> bool:
        return self.employee is not None


def _field(obj: Any, name: str) -> str:
    value = obj.get(name, "") if isinstance(obj, dict) else getattr(obj, name, "")
    return str(value) if value else ""


def _full_name(employee: Any) -> str:
    return f"{_field(employee, 'first_name')} {_field(employee, 'last_name')}".strip()


def _employee_variants(employee: Any) -> list[list[str]]:
    """Formas válidas de un funcionario: nombre completo, nombre+1er apellido, nombre+último apellido."""
    first = _field(employee, "first_name").strip()
    last = _field(employee, "last_name").strip()
    raw = [f"{first} {last}".strip()]
    parts = last.split()
    if first and parts:
        raw.append(f"{first} {parts[0]}")
        raw.append(f"{first} {parts[-1]}")
    return [name_tokens(v) for v in raw if v.strip()]


def _score_tokens(candidate: list[str], variant: list[str]) -> float:
    if not candidate or not variant:
        return 0.0
    if candidate == variant:
        return 1.0
    if candidate[0] != variant[0]:
        return 0.0
    cand_rest = set(candidate[1:])
    var_rest = set(variant[1:])
    if not cand_rest or not var_rest:
        return 0.0
    if cand_rest <= var_rest or var_rest <= cand_rest:
        return 0.92
    intersection = cand_rest & var_rest
    if intersection:
        overlap = len(intersection) / min(len(cand_rest), len(var_rest))
        if overlap >= 0.5:
            return round(0.75 + 0.15 * overlap, 3)
    return 0.0


def score_candidate(candidate: str, employee: Any) -> float:
    """Puntúa (0..1) qué tan probable es que `candidate` corresponda a `employee`."""
    cand_tokens = name_tokens(candidate)
    if not cand_tokens:
        return 0.0
    best = 0.0
    for variant in _employee_variants(employee):
        best = max(best, _score_tokens(cand_tokens, variant))
    if best < 1.0:
        emp_full = _full_name(employee)
        emp_tokens = name_tokens(emp_full)
        if emp_tokens and cand_tokens[0] == emp_tokens[0]:
            ratio = SequenceMatcher(None, normalize_name(candidate), normalize_name(emp_full)).ratio()
            if ratio >= 0.88:
                best = max(best, round(0.7 + 0.2 * ratio, 3))
    return best


def _full_name_ratio(candidate: str, employee: Any) -> float:
    cand = normalize_name(candidate)
    emp = normalize_name(_full_name(employee))
    if not cand or not emp:
        return 0.0
    return SequenceMatcher(None, cand, emp).ratio()


def best_employee_match(
    candidate: str,
    employees: list[Any],
    threshold: float = MATCH_THRESHOLD,
) -> NameMatchResult:
    """
    Devuelve el funcionario más probable para un nombre candidato.
    `reason` ∈ EXACT | TOKENS | FUZZY | NONE | AMBIGUOUS.
    """
    scored: list[tuple[float, Any]] = []
    for emp in employees:
        score = score_candidate(candidate, emp)
        if score > 0:
            scored.append((score, emp))
    if not scored:
        return NameMatchResult(None, 0.0, "NONE")

    scored.sort(key=lambda item: item[0], reverse=True)
    best_score, best_emp = scored[0]
    if best_score < threshold:
        return NameMatchResult(None, best_score, "NONE")

    rivals = [emp for score, emp in scored[1:] if best_score - score <= AMBIGUITY_MARGIN]
    if rivals:
        contenders = [best_emp, *rivals]
        contenders.sort(key=lambda emp: _full_name_ratio(candidate, emp), reverse=True)
        top_ratio = _full_name_ratio(candidate, contenders[0])
        if len(contenders) > 1 and top_ratio - _full_name_ratio(candidate, contenders[1]) <= FUZZY_MARGIN:
            return NameMatchResult(None, best_score, "AMBIGUOUS")
        best_emp = contenders[0]

    if best_score >= 1.0:
        reason = "EXACT"
    elif best_score >= 0.9:
        reason = "TOKENS"
    else:
        reason = "FUZZY"
    return NameMatchResult(best_emp, best_score, reason)
