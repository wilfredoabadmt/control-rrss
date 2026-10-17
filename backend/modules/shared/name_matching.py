"""
Cotejo difuso de nombres de funcionarios — GAMEA Social Monitor
Principio VII (Cotejo Robusto de Identidades), REQ-INT-003, BR-INT-006..009

Los nombres copiados del diálogo de reacciones de Facebook no coinciden literalmente
con el padrón municipal (nombres compuestos, un solo apellido, acentos, mayúsculas,
apellidos invertidos, uso del segundo nombre o títulos profesionales).
Este módulo puntúa cada candidato contra el padrón con rigor epistémico:
exige coincidencia en nombre de pila y apellido, reconociendo variantes válidas
sin imputar actividad a funcionarios homónimos o ambiguos.
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

NOISE_TITLES = {
    "lic", "licda", "licdo", "ing", "dr", "dra", "abg", "abog", "prof",
    "msc", "phd", "sr", "sra", "univ", "tec", "tecnico", "don", "dona",
}


def normalize_name(text: str | None) -> str:
    """Normaliza un nombre sin acentos, en minúsculas y sin separadores."""
    if not text:
        return ""
    norm = unicodedata.normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9]", "", norm.lower().strip())


def extract_social_handle(account_str: str | None) -> str:
    """Extrae el handle o identificador limpio de una cuenta social (incluso si es URL completa)."""
    if not account_str:
        return ""
    raw = str(account_str).strip()
    if "facebook.com" in raw.lower() or "fb.me" in raw.lower() or "tiktok.com" in raw.lower():
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
        qs = parse_qs(parsed.query)
        if "id" in qs and qs["id"]:
            return qs["id"][0].strip()
        path_parts = [p for p in parsed.path.split("/") if p and p.lower() not in ("profile.php", "people", "pages")]
        if path_parts:
            return path_parts[-1].strip().lstrip("@")
    return raw.lstrip("@").strip()


def name_tokens(text: str | None, strip_titles: bool = True) -> list[str]:
    """Extrae los tokens alfanuméricos de un nombre en minúsculas y sin acentos."""
    if not text:
        return []
    norm = unicodedata.normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("utf-8")
    tokens = [t for t in re.split(r"[^a-z0-9]+", norm.lower()) if t]
    if strip_titles:
        tokens = [t for t in tokens if t not in NOISE_TITLES]
    return tokens


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
    """
    Formas válidas de un funcionario:
    - Nombre completo
    - Primer nombre + primer apellido
    - Primer nombre + segundo apellido
    - Segundo nombre + primer apellido
    - Segundo nombre + segundo apellido
    - Nombres + primer apellido
    - Formas invertidas (apellidos primero)
    """
    first_tokens = name_tokens(_field(employee, "first_name"))
    last_tokens = name_tokens(_field(employee, "last_name"))

    variants: list[list[str]] = []
    if not first_tokens or not last_tokens:
        raw_full = name_tokens(_full_name(employee))
        return [raw_full] if raw_full else []

    # 1. Nombre completo
    variants.append(first_tokens + last_tokens)
    variants.append(last_tokens + first_tokens)

    # 2. Primer nombre + apellidos
    variants.append([first_tokens[0], last_tokens[0]])
    variants.append([last_tokens[0], first_tokens[0]])
    if len(last_tokens) > 1:
        variants.append([first_tokens[0], last_tokens[-1]])
        variants.append(first_tokens + [last_tokens[0]])
        variants.append(first_tokens + [last_tokens[-1]])

    # 3. Segundo nombre + apellidos (muy frecuente en Bolivia)
    if len(first_tokens) > 1:
        variants.append([first_tokens[1], last_tokens[0]])
        variants.append([last_tokens[0], first_tokens[1]])
        if len(last_tokens) > 1:
            variants.append([first_tokens[1], last_tokens[-1]])
            variants.append([last_tokens[-1], first_tokens[1]])

    # Eliminar duplicados preservando orden
    seen = set()
    deduped = []
    for v in variants:
        t = tuple(v)
        if t not in seen and v:
            seen.add(t)
            deduped.append(v)
    return deduped


def score_candidate(candidate: str, employee: Any) -> float:
    """Puntúa (0..1) qué tan probable es que `candidate` corresponda a `employee`."""
    cand_tokens = name_tokens(candidate, strip_titles=True)
    if not cand_tokens:
        return 0.0

    first_tokens = set(name_tokens(_field(employee, "first_name"), strip_titles=True))
    last_tokens = set(name_tokens(_field(employee, "last_name"), strip_titles=True))

    cand_set = set(cand_tokens)

    # Regla epistémica fundamental: Si el candidato tiene 2 o más tokens,
    # DEBE coincidir al menos en un nombre de pila Y en un apellido del funcionario.
    # Evita que 'María Flores Callisaya' empate con 'Patricia Flores Callisaya'.
    has_first_match = bool(cand_set & first_tokens)
    has_last_match = bool(cand_set & last_tokens)

    if not has_first_match and not has_last_match:
        # Podría ser coincidencia difusa alta sobre el nombre completo
        emp_full = _full_name(employee)
        ratio = SequenceMatcher(None, normalize_name(candidate), normalize_name(emp_full)).ratio()
        if ratio >= 0.88:
            return round(0.7 + 0.2 * ratio, 3)
        return 0.0

    if not has_first_match:
        # Tiene coincidencia en apellido pero NO en nombre de pila -> No es el mismo funcionario
        return 0.0

    if not has_last_match and len(cand_tokens) >= 2:
        # Tiene coincidencia en nombre de pila pero NO en apellido -> No es el mismo funcionario
        return 0.0

    best = 0.0
    for variant in _employee_variants(employee):
        if cand_tokens == variant:
            best = max(best, 1.0)
            break
        var_set = set(variant)
        if cand_set == var_set:
            best = max(best, 0.98)
            continue
        if cand_set <= var_set or var_set <= cand_set:
            best = max(best, 0.92)
            continue
        intersection = cand_set & var_set
        if intersection:
            overlap = len(intersection) / max(len(cand_set), len(var_set))
            if overlap >= 0.5:
                best = max(best, round(0.75 + 0.15 * overlap, 3))

    if best < 1.0:
        emp_full = _full_name(employee)
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
