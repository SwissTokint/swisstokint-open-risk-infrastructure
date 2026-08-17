"""Independent Python verifier for the local ``pom-rx/0.1`` receipt profile.

This module is deliberately limited to the v0.1 three-phase receipt chain.
It does not implement the proposed POM-RX v0.2 evidence roles and does not
connect to a wallet, provider or network.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from swisstokint_proof import canonicalize_payload, sha256_hex

POM_RX_SCHEMA_VERSION = "pom-rx/0.1"

HASH_PATTERN = re.compile(r"^[a-f0-9]{64}$")
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$")
RULE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{2,63}$")
SOURCE_KEY_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
PHASES = ("preflight", "execution", "reconciliation")
PHASE_OUTCOMES = {
    "preflight": {"allow", "deny"},
    "execution": {"accepted", "rejected", "unresolved"},
    "reconciliation": {"matched", "mismatched", "unresolved"},
}
PROOF_MODES = {"commitment", "public", "zk"}
ASSERTION_RESULTS = {"pass", "fail", "not_evaluated"}


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _assert_exact_keys(value: Any, expected_keys: set[str], label: str) -> None:
    _assert(isinstance(value, dict), f"{label} must be an object")
    _assert(set(value) == expected_keys, f"{label} has missing or unknown fields")


def _assert_hash(value: Any, field: str) -> None:
    _assert(isinstance(value, str) and HASH_PATTERN.fullmatch(value) is not None, f"{field} must be a lowercase SHA-256 hash")


def _assert_identifier(value: Any, field: str, pattern: re.Pattern[str] = ID_PATTERN) -> None:
    _assert(isinstance(value, str) and pattern.fullmatch(value) is not None, f"{field} has an invalid format")


def _normalise_datetime(value: Any, field: str) -> str:
    _assert(isinstance(value, str) and re.search(r"(Z|[+-]\d{2}:\d{2})$", value) is not None, f"{field} must include an offset")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"{field} must be an ISO date-time") from error
    _assert(parsed.tzinfo is not None, f"{field} must include an offset")
    utc = parsed.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1_000:03d}Z"


def _validate_assertion(assertion: Any) -> dict[str, str]:
    _assert_exact_keys(assertion, {"rule_id", "rule_hash", "result", "proof_mode", "evidence_hash"}, "Risk assertion")
    _assert_identifier(assertion["rule_id"], "rule_id", RULE_ID_PATTERN)
    _assert_hash(assertion["rule_hash"], "rule_hash")
    _assert(assertion["result"] in ASSERTION_RESULTS, "Unsupported assertion result")
    _assert(assertion["proof_mode"] in PROOF_MODES, "Unsupported proof_mode")
    _assert_hash(assertion["evidence_hash"], "evidence_hash")
    return dict(assertion)


def validate_pom_rx_receipt(receipt: Any) -> dict[str, Any]:
    expected_keys = {
        "schema_version", "receipt_id", "run_id", "phase", "outcome", "agent_ref", "subject_ref",
        "method_hash", "policy_hash", "input_commitment", "action_commitment", "assertions",
        "previous_receipt_hash", "occurred_at", "source_key_id",
    }
    _assert_exact_keys(receipt, expected_keys, "POM-RX receipt")
    _assert(receipt["schema_version"] == POM_RX_SCHEMA_VERSION, "Unsupported POM-RX schema version")
    _assert_identifier(receipt["receipt_id"], "receipt_id")
    _assert_identifier(receipt["run_id"], "run_id")
    _assert(receipt["phase"] in PHASES, "Unsupported POM-RX phase")
    _assert(receipt["outcome"] in PHASE_OUTCOMES[receipt["phase"]], "Outcome is invalid for this POM-RX phase")
    for field in ("agent_ref", "subject_ref"):
        value = receipt[field]
        _assert(isinstance(value, str) and 1 <= len(value.strip()) <= 256 and re.search(r"[\x00-\x1f\x7f]", value) is None, f"{field} has an invalid format")
    for field in ("method_hash", "policy_hash", "input_commitment", "action_commitment"):
        _assert_hash(receipt[field], field)

    assertions = receipt["assertions"]
    _assert(isinstance(assertions, list) and 1 <= len(assertions) <= 64, "assertions must contain between 1 and 64 entries")
    normalised_assertions = [_validate_assertion(item) for item in assertions]
    _assert(len({item["rule_id"] for item in normalised_assertions}) == len(normalised_assertions), "assertions cannot repeat a rule_id")
    normalised_assertions.sort(key=lambda item: item["rule_id"])

    if receipt["phase"] == "preflight":
        _assert(receipt["previous_receipt_hash"] is None, "A preflight receipt cannot have a previous receipt")
        if receipt["outcome"] == "allow":
            _assert(all(item["result"] == "pass" for item in normalised_assertions), "An allow preflight requires every assertion to pass")
        else:
            _assert(any(item["result"] == "fail" for item in normalised_assertions), "A deny preflight requires at least one failed assertion")
    else:
        _assert_hash(receipt["previous_receipt_hash"], "previous_receipt_hash")

    _assert_identifier(receipt["source_key_id"], "source_key_id", SOURCE_KEY_ID_PATTERN)
    normalised = dict(receipt)
    normalised["agent_ref"] = unicodedata.normalize("NFC", receipt["agent_ref"])
    normalised["subject_ref"] = unicodedata.normalize("NFC", receipt["subject_ref"])
    normalised["assertions"] = normalised_assertions
    normalised["occurred_at"] = _normalise_datetime(receipt["occurred_at"], "occurred_at")
    return normalised


def commit_pom_rx_receipt(receipt: Any) -> dict[str, Any]:
    normalised = validate_pom_rx_receipt(receipt)
    canonical_receipt = canonicalize_payload(normalised)
    return {
        "receipt": normalised,
        "canonical_receipt": canonical_receipt,
        "receipt_hash": sha256_hex(f"swisstokint:pom-rx:v1:{canonical_receipt}"),
    }


def _assert_pom_rx_chain(receipts: Any, allow_partial: bool) -> list[dict[str, Any]]:
    _assert(isinstance(receipts, list) and len(receipts) >= 1, "A POM-RX chain requires at least one receipt")
    _assert(len(receipts) <= len(PHASES), "A POM-RX chain cannot exceed three receipts")
    committed = [commit_pom_rx_receipt(receipt) for receipt in receipts]
    first = committed[0]
    _assert(first["receipt"]["phase"] == "preflight", "A POM-RX chain must start with preflight")

    for index in range(1, len(committed)):
        previous = committed[index - 1]
        current = committed[index]
        _assert(PHASES.index(current["receipt"]["phase"]) == PHASES.index(previous["receipt"]["phase"]) + 1, "POM-RX phases must be contiguous and ordered")
        _assert(current["receipt"]["previous_receipt_hash"] == previous["receipt_hash"], "POM-RX previous_receipt_hash does not match")
        _assert(current["receipt"]["occurred_at"] >= previous["receipt"]["occurred_at"], "POM-RX receipt time cannot move backwards")
        for field in ("run_id", "agent_ref", "subject_ref", "method_hash", "policy_hash"):
            _assert(current["receipt"][field] == first["receipt"][field], f"{field} changed within the POM-RX chain")

    if first["receipt"]["outcome"] == "deny":
        _assert(len(committed) == 1, "A denied preflight cannot be followed by execution")
        return committed
    if not allow_partial:
        _assert(len(committed) >= 2, "An allowed preflight requires an execution receipt")

    execution = next((item for item in committed if item["receipt"]["phase"] == "execution"), None)
    reconciliation = next((item for item in committed if item["receipt"]["phase"] == "reconciliation"), None)
    if execution is not None and execution["receipt"]["outcome"] == "accepted" and not allow_partial:
        _assert(reconciliation is not None, "An accepted execution requires reconciliation")
    if execution is not None and execution["receipt"]["outcome"] == "rejected":
        _assert(reconciliation is None, "A rejected execution cannot be marked as reconciled")
    return committed


def verify_pom_rx_chain(receipts: Any, allow_partial: bool = False) -> dict[str, Any]:
    try:
        committed = _assert_pom_rx_chain(receipts, allow_partial)
        last = committed[-1]["receipt"]
        return {"ok": True, "status": f"{last['phase']}:{last['outcome']}", "receipt_hashes": [item["receipt_hash"] for item in committed]}
    except Exception as error:
        return {"ok": False, "error": str(error), "receipt_hashes": []}
