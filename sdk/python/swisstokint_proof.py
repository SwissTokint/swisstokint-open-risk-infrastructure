"""SwissTokint Proof of Method Receipt v0.2 SDK."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import math
import re
import time
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Any

from cryptography.hazmat.primitives.serialization import load_der_public_key

RECEIPT_SCHEMA_VERSION = "pom-receipt/0.2"
BATCH_SCHEMA_VERSION = "pom-batch/0.1"
ANCHOR_RECORD_SCHEMA_VERSION = "pom-anchor-record/0.1"

HASH_PATTERN = re.compile(r"^[a-f0-9]{64}$")
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$")
SOURCE_KEY_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
ADAPTER_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._/-]{2,63}$")
PAYLOAD_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
KINDS = {"signal", "research", "governance", "milestone"}
MAX_DEPTH = 8
MAX_STRING_LENGTH = 2_048
MAX_CANONICAL_BYTES = 16 * 1024
MAX_SAFE_INTEGER = 9_007_199_254_740_991

SENSITIVE_PAYLOAD_KEYS = {
    "apikey",
    "apisecret",
    "accesskey",
    "accesssecret",
    "accesstoken",
    "refreshtoken",
    "password",
    "secret",
    "privatekey",
    "seedphrase",
    "mnemonic",
    "email",
    "phone",
    "walletaddress",
    "balance",
    "accountbalance",
    "accountid",
    "userid",
    "position",
    "positions",
}


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _normalised_sensitive_key(key: str) -> str:
    normalised = unicodedata.normalize("NFKC", key).lower()
    return re.sub(r"[^a-z0-9]", "", normalised)


def _validate_safe_value(value: Any, depth: int = 0, budget: list[int] | None = None) -> None:
    if budget is None:
        budget = [1_000]
    _assert(depth <= MAX_DEPTH, "Payload exceeds the maximum depth")
    _assert(budget[0] > 0, "Payload exceeds the maximum node count")
    budget[0] -= 1

    if value is None or isinstance(value, bool):
        return
    if isinstance(value, str):
        _assert(len(value) <= MAX_STRING_LENGTH, "Payload string is too long")
        return
    if isinstance(value, int):
        _assert(abs(value) <= MAX_SAFE_INTEGER, "Payload integer exceeds the safe range")
        return
    if isinstance(value, float):
        _assert(False, "Payload numbers must be safe integers")
    if isinstance(value, list):
        for item in value:
            _validate_safe_value(item, depth + 1, budget)
        return

    _assert(isinstance(value, dict), "Payload contains an unsupported value")
    for key, nested_value in value.items():
        _assert(isinstance(key, str) and PAYLOAD_KEY_PATTERN.fullmatch(key) is not None, f"Unsafe payload key: {key}")
        _assert(_normalised_sensitive_key(key) not in SENSITIVE_PAYLOAD_KEYS, f"Sensitive payload key: {key}")
        _validate_safe_value(nested_value, depth + 1, budget)


def _canonicalize_value(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        return json.dumps(unicodedata.normalize("NFC", value), ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(_canonicalize_value(item) for item in value) + "]"
    return "{" + ",".join(
        json.dumps(key, ensure_ascii=False) + ":" + _canonicalize_value(value[key])
        for key in sorted(value)
    ) + "}"


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonicalize_payload(payload: dict[str, Any]) -> str:
    _assert(isinstance(payload, dict), "Payload must be a JSON object")
    _validate_safe_value(payload)
    canonical = _canonicalize_value(payload)
    _assert(len(canonical.encode("utf-8")) <= MAX_CANONICAL_BYTES, "Canonical payload exceeds 16 KiB")
    return canonical


def commit_payload(payload: dict[str, Any]) -> dict[str, str]:
    canonical_payload = canonicalize_payload(payload)
    return {
        "canonical_payload": canonical_payload,
        "payload_hash": sha256_hex(canonical_payload),
    }


def _normalise_occurred_at(value: str) -> str:
    _assert(isinstance(value, str), "occurred_at must be an ISO date-time")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    _assert(parsed.tzinfo is not None, "occurred_at must include an offset")
    utc = parsed.astimezone(timezone.utc)
    milliseconds = utc.microsecond // 1_000
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{milliseconds:03d}Z"


def _normalise_datetime(value: str, field: str) -> str:
    _assert(isinstance(value, str), f"{field} must be an ISO date-time")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    _assert(parsed.tzinfo is not None, f"{field} must include an offset")
    utc = parsed.astimezone(timezone.utc)
    milliseconds = utc.microsecond // 1_000
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{milliseconds:03d}Z"


def validate_anchor_record(record: dict[str, Any]) -> dict[str, Any]:
    _assert(isinstance(record, dict), "Anchor record must be an object")
    expected_keys = {
        "schema_version",
        "adapter_id",
        "network",
        "batch_ref",
        "merkle_root",
        "transaction_ref",
        "block_ref",
        "anchored_at",
        "observed_at",
        "status",
        "confirmations",
    }
    _assert(set(record) == expected_keys, "Anchor record has missing or unknown fields")
    _assert(
        record["schema_version"] == ANCHOR_RECORD_SCHEMA_VERSION,
        "Unsupported anchor record schema version",
    )
    _assert(
        isinstance(record["adapter_id"], str)
        and ADAPTER_ID_PATTERN.fullmatch(record["adapter_id"]) is not None,
        "adapter_id has an invalid format",
    )
    _assert(
        isinstance(record["network"], str)
        and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/-]{1,63}", record["network"]) is not None,
        "network has an invalid format",
    )
    _assert(
        isinstance(record["batch_ref"], str)
        and re.fullmatch(r"pom-[a-f0-9]{24}", record["batch_ref"]) is not None,
        "batch_ref has an invalid format",
    )
    _assert(
        isinstance(record["merkle_root"], str)
        and HASH_PATTERN.fullmatch(record["merkle_root"]) is not None,
        "merkle_root must be a lowercase SHA-256 hash",
    )
    for field in ("transaction_ref", "block_ref"):
        value = record[field]
        _assert(
            isinstance(value, str)
            and 1 <= len(value) <= 256
            and re.search(r"[\x00-\x1f\x7f]", value) is None,
            f"{field} has an invalid format",
        )
    _assert(
        record["status"] in {"observed", "finalized", "revoked", "orphaned"},
        "Unsupported anchor status",
    )
    confirmations = record["confirmations"]
    _assert(
        isinstance(confirmations, int)
        and not isinstance(confirmations, bool)
        and 0 <= confirmations <= 1_000_000_000,
        "confirmations must be a non-negative safe integer",
    )
    _assert(
        record["status"] != "finalized" or confirmations >= 1,
        "A finalized anchor requires at least one confirmation",
    )

    anchored_at = _normalise_datetime(record["anchored_at"], "anchored_at")
    observed_at = _normalise_datetime(record["observed_at"], "observed_at")
    _assert(observed_at >= anchored_at, "observed_at cannot precede anchored_at")

    normalised = dict(record)
    normalised["network"] = unicodedata.normalize("NFC", record["network"])
    normalised["transaction_ref"] = unicodedata.normalize("NFC", record["transaction_ref"])
    normalised["block_ref"] = unicodedata.normalize("NFC", record["block_ref"])
    normalised["anchored_at"] = anchored_at
    normalised["observed_at"] = observed_at
    return normalised


def commit_anchor_record(record: dict[str, Any]) -> dict[str, Any]:
    normalised = validate_anchor_record(record)
    canonical_record = _canonicalize_value(normalised)
    return {
        "record": normalised,
        "canonical_record": canonical_record,
        "record_hash": sha256_hex(f"swisstokint:pom-anchor-record:v1:{canonical_record}"),
    }


def validate_wire_receipt(receipt: dict[str, Any]) -> dict[str, Any]:
    _assert(isinstance(receipt, dict), "Receipt must be an object")
    expected_keys = {
        "schema_version",
        "receipt_id",
        "kind",
        "subject_ref",
        "method_hash",
        "risk_policy_hash",
        "payload_hash",
        "occurred_at",
        "nonce",
        "source_key_id",
    }
    _assert(set(receipt) == expected_keys, "Receipt has missing or unknown fields")
    _assert(receipt["schema_version"] == RECEIPT_SCHEMA_VERSION, "Unsupported receipt schema version")
    _assert(ID_PATTERN.fullmatch(receipt["receipt_id"]) is not None, "receipt_id has an invalid format")
    _assert(receipt["kind"] in KINDS, "Unsupported receipt kind")
    subject_ref = receipt["subject_ref"]
    _assert(isinstance(subject_ref, str) and 1 <= len(subject_ref.strip()) <= 128, "subject_ref has an invalid length")
    for field in ("method_hash", "risk_policy_hash", "payload_hash"):
        _assert(isinstance(receipt[field], str) and HASH_PATTERN.fullmatch(receipt[field]) is not None, f"{field} must be a lowercase SHA-256 hash")
    _assert(ID_PATTERN.fullmatch(receipt["nonce"]) is not None, "nonce has an invalid format")
    _assert(SOURCE_KEY_ID_PATTERN.fullmatch(receipt["source_key_id"]) is not None, "source_key_id has an invalid format")

    normalised = dict(receipt)
    normalised["subject_ref"] = unicodedata.normalize("NFC", subject_ref)
    normalised["occurred_at"] = _normalise_occurred_at(receipt["occurred_at"])
    return normalised


def create_wire_receipt(event: dict[str, Any], source_key_id: str = "proof-sdk-v2") -> dict[str, Any]:
    _assert(isinstance(event, dict), "Event must be an object")
    payload_hash = commit_payload(event["payload"])["payload_hash"]
    return validate_wire_receipt({
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "receipt_id": event.get("receipt_id", str(uuid.uuid4())),
        "kind": event["kind"],
        "subject_ref": event["subject_ref"],
        "method_hash": event["method_hash"],
        "risk_policy_hash": event["risk_policy_hash"],
        "payload_hash": payload_hash,
        "occurred_at": event.get("occurred_at", datetime.now(timezone.utc).isoformat()),
        "nonce": event.get("nonce", str(uuid.uuid4())),
        "source_key_id": event.get("source_key_id", source_key_id),
    })


def prepare_commitment(wire_receipt: dict[str, Any]) -> dict[str, Any]:
    receipt = validate_wire_receipt(wire_receipt)
    public_commitment = {
        "version": 2,
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "receipt_id": receipt["receipt_id"],
        "kind": receipt["kind"],
        "subject_ref": receipt["subject_ref"],
        "method_hash": receipt["method_hash"],
        "risk_policy_hash": receipt["risk_policy_hash"],
        "payload_hash": receipt["payload_hash"],
        "nonce_hash": sha256_hex(receipt["nonce"]),
        "occurred_at": receipt["occurred_at"],
        "source_key_id": receipt["source_key_id"],
    }
    commitment = _canonicalize_value(public_commitment)
    return {
        "public_commitment": public_commitment,
        "commitment": commitment,
        "commitment_hash": sha256_hex(commitment),
    }


def sign_transport(raw_body: str, secret: str, timestamp: str | None = None) -> dict[str, str]:
    _assert(isinstance(raw_body, str), "raw_body must be a string")
    _assert(isinstance(secret, str) and len(secret) >= 32, "Transport secret must contain at least 32 characters")
    timestamp = timestamp or str(math.floor(time.time()))
    _assert(re.fullmatch(r"\d{10}", timestamp) is not None, "Transport timestamp must contain 10 digits")
    message = f"{timestamp}.{raw_body}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return {"timestamp": timestamp, "signature": signature}


def verify_stored_receipt(record: dict[str, Any]) -> dict[str, bool]:
    commitment_hash_valid = False
    commitment_fields_valid = False
    signature_valid = False
    try:
        commitment_hash_valid = sha256_hex(record["commitment"]) == record["commitment_hash"]
        parsed_commitment = json.loads(record["commitment"])
        comparable_fields = (
            "schema_version",
            "receipt_id",
            "kind",
            "subject_ref",
            "method_hash",
            "risk_policy_hash",
            "payload_hash",
            "nonce_hash",
            "occurred_at",
            "source_key_id",
        )
        commitment_fields_valid = all(
            field not in record or record[field] == parsed_commitment.get(field)
            for field in comparable_fields
        )
        public_key = load_der_public_key(base64.b64decode(record["server_public_key"], validate=True))
        public_key.verify(
            base64.b64decode(record["server_signature"], validate=True),
            record["commitment"].encode("utf-8"),
        )
        signature_valid = True
    except Exception:
        return {
            "ok": False,
            "commitment_hash_valid": commitment_hash_valid,
            "commitment_fields_valid": commitment_fields_valid,
            "signature_valid": signature_valid,
        }
    return {
        "ok": commitment_hash_valid and commitment_fields_valid and signature_valid,
        "commitment_hash_valid": commitment_hash_valid,
        "commitment_fields_valid": commitment_fields_valid,
        "signature_valid": signature_valid,
    }


def _hash_merkle_leaf(commitment_hash: str) -> str:
    _assert(HASH_PATTERN.fullmatch(commitment_hash) is not None, "commitment_hash must be a lowercase SHA-256 hash")
    return sha256_hex(f"swisstokint:proof-leaf:v1:{commitment_hash}")


def _hash_merkle_node(left: str, right: str) -> str:
    _assert(HASH_PATTERN.fullmatch(left) is not None, "left node must be a lowercase SHA-256 hash")
    _assert(HASH_PATTERN.fullmatch(right) is not None, "right node must be a lowercase SHA-256 hash")
    return sha256_hex(f"swisstokint:proof-node:v1:{left}:{right}")


def build_merkle_batch(receipts: list[dict[str, Any]]) -> dict[str, Any]:
    _assert(isinstance(receipts, list) and len(receipts) > 0, "A batch requires at least one receipt")
    _assert(len(receipts) <= 10_000, "A batch cannot exceed 10,000 receipts")

    ordered = []
    for receipt in receipts:
        _assert(isinstance(receipt, dict), "Batch receipt must be an object")
        _assert(
            set(receipt) == {"receipt_id", "commitment_hash", "occurred_at"},
            "Batch receipt has missing or unknown fields",
        )
        _assert(ID_PATTERN.fullmatch(receipt["receipt_id"]) is not None, "receipt_id has an invalid format")
        _assert(HASH_PATTERN.fullmatch(receipt["commitment_hash"]) is not None, "commitment_hash must be a lowercase SHA-256 hash")
        ordered.append({
            "receipt_id": receipt["receipt_id"],
            "commitment_hash": receipt["commitment_hash"],
            "occurred_at": _normalise_occurred_at(receipt["occurred_at"]),
        })
    ordered.sort(key=lambda item: (item["occurred_at"], item["receipt_id"]))

    _assert(len({item["receipt_id"] for item in ordered}) == len(ordered), "Duplicate receipt_id in batch")
    _assert(len({item["commitment_hash"] for item in ordered}) == len(ordered), "Duplicate commitment_hash in batch")

    leaf_hashes = [_hash_merkle_leaf(item["commitment_hash"]) for item in ordered]
    proofs: list[list[dict[str, str]]] = [[] for _ in ordered]
    level = [{"hash": value, "descendants": [index]} for index, value in enumerate(leaf_hashes)]

    while len(level) > 1:
        next_level = []
        for index in range(0, len(level), 2):
            left = level[index]
            right = level[index + 1] if index + 1 < len(level) else left

            for descendant in left["descendants"]:
                proofs[descendant].append({"position": "right", "hash": right["hash"]})
            if right is not left:
                for descendant in right["descendants"]:
                    proofs[descendant].append({"position": "left", "hash": left["hash"]})

            next_level.append({
                "hash": _hash_merkle_node(left["hash"], right["hash"]),
                "descendants": (
                    list(left["descendants"])
                    if right is left
                    else [*left["descendants"], *right["descendants"]]
                ),
            })
        level = next_level

    merkle_root = level[0]["hash"]
    return {
        "schema_version": BATCH_SCHEMA_VERSION,
        "tree_algorithm": "sha256-domain-separated-duplicate-last",
        "ordering": "occurred_at-asc,receipt_id-asc",
        "batch_ref": f"pom-{merkle_root[:24]}",
        "leaf_count": len(ordered),
        "merkle_root": merkle_root,
        "leaves": [
            {
                **receipt,
                "leaf_index": index,
                "leaf_hash": leaf_hashes[index],
                "proof": proofs[index],
            }
            for index, receipt in enumerate(ordered)
        ],
    }


def verify_merkle_proof(commitment_hash: str, proof: list[dict[str, str]], merkle_root: str) -> bool:
    try:
        _assert(HASH_PATTERN.fullmatch(commitment_hash) is not None, "Invalid commitment hash")
        _assert(HASH_PATTERN.fullmatch(merkle_root) is not None, "Invalid Merkle root")
        _assert(isinstance(proof, list) and len(proof) <= 32, "Invalid Merkle proof")
        current = _hash_merkle_leaf(commitment_hash)
        for step in proof:
            _assert(step["position"] in {"left", "right"}, "Invalid Merkle proof position")
            _assert(HASH_PATTERN.fullmatch(step["hash"]) is not None, "Invalid proof hash")
            current = (
                _hash_merkle_node(step["hash"], current)
                if step["position"] == "left"
                else _hash_merkle_node(current, step["hash"])
            )
        return current == merkle_root
    except (KeyError, TypeError, ValueError):
        return False
