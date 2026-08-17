#!/usr/bin/env python3
"""Verify one local POM-RX v0.1 receipt chain without network access.

The command accepts either a JSON array of receipts or a vector object with a
``chain`` member and an optional ``expected`` result. It is intentionally
limited to the existing ``pom-rx/0.1`` profile.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "sdk" / "python"))

from pom_rx import verify_pom_rx_chain  # noqa: E402


MAX_INPUT_BYTES = 256 * 1024


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"JSON object has a duplicate key: {key}")
        result[key] = value
    return result


def _reject_non_finite_number(value: str) -> None:
    raise ValueError(f"JSON must not contain a non-finite number: {value}")


def _load_json(path: Path) -> Any:
    raw = path.read_bytes()
    if len(raw) > MAX_INPUT_BYTES:
        raise ValueError(f"Input exceeds the {MAX_INPUT_BYTES}-byte limit")
    try:
        return json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_non_finite_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        raise ValueError(f"Invalid JSON input: {error}") from error


def _extract_chain(payload: Any) -> tuple[Any, dict[str, Any] | None]:
    if isinstance(payload, list):
        return payload, None
    if not isinstance(payload, dict) or "chain" not in payload:
        raise ValueError("Input must be a receipt array or an object with a chain member")
    unknown = set(payload) - {"chain", "expected"}
    if unknown:
        raise ValueError("Input has unknown top-level fields")
    expected = payload.get("expected")
    if expected is not None and not isinstance(expected, dict):
        raise ValueError("expected must be an object when supplied")
    return payload["chain"], expected


def _write_result(result: dict[str, Any]) -> None:
    print(json.dumps(result, ensure_ascii=True, separators=(",", ":"), sort_keys=True))


def main(arguments: list[str]) -> int:
    if len(arguments) != 1:
        print("Usage: verify-pom-rx-v0.1.py <bundle.json>", file=sys.stderr)
        return 64

    try:
        chain, expected = _extract_chain(_load_json(Path(arguments[0])))
        result = verify_pom_rx_chain(chain)
        if expected is not None and result != expected:
            result = {
                "ok": False,
                "error": "Verifier result does not match the bundle expected result",
                "receipt_hashes": result["receipt_hashes"],
            }
    except (OSError, ValueError) as error:
        _write_result({"ok": False, "error": str(error), "receipt_hashes": []})
        return 2

    _write_result(result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
