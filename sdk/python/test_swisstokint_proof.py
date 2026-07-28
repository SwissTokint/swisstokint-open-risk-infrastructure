from __future__ import annotations

import base64
import json
import pathlib
import sys
import unittest

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

SDK_DIR = pathlib.Path(__file__).resolve().parent
ROOT = SDK_DIR.parents[1]
sys.path.insert(0, str(SDK_DIR))

from swisstokint_proof import (  # noqa: E402
    build_merkle_batch,
    canonicalize_payload,
    commit_payload,
    create_wire_receipt,
    prepare_commitment,
    sign_transport,
    verify_merkle_proof,
    verify_stored_receipt,
)


class ProofReceiptSdkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.event = json.loads((ROOT / "schemas/examples/proof-event-v0.2.json").read_text(encoding="utf-8"))
        cls.expected = json.loads((ROOT / "schemas/examples/proof-receipt-v0.2.expected.json").read_text(encoding="utf-8"))
        cls.batch_input = json.loads((ROOT / "schemas/examples/proof-batch-input-v0.1.json").read_text(encoding="utf-8"))
        cls.expected_batch = json.loads((ROOT / "schemas/examples/proof-batch-v0.1.expected.json").read_text(encoding="utf-8"))

    def test_cross_language_fixture(self) -> None:
        wire_receipt = create_wire_receipt(self.event)
        payload = commit_payload(self.event["payload"])
        prepared = prepare_commitment(wire_receipt)
        self.assertEqual(wire_receipt, self.expected["wire_receipt"])
        self.assertEqual(payload["canonical_payload"], self.expected["canonical_payload"])
        self.assertEqual(prepared["commitment"], self.expected["commitment"])
        self.assertEqual(prepared["commitment_hash"], self.expected["commitment_hash"])

    def test_payload_rejects_sensitive_and_float_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "Sensitive payload key"):
            canonicalize_payload({"api_key": "not-allowed"})
        with self.assertRaisesRegex(ValueError, "Sensitive payload key"):
            canonicalize_payload({"balance": 100})
        with self.assertRaisesRegex(ValueError, "safe integers"):
            canonicalize_payload({"confidence": 0.75})

    def test_transport_signature_fixture(self) -> None:
        body = json.dumps(self.expected["wire_receipt"], ensure_ascii=False, separators=(",", ":"))
        self.assertEqual(
            sign_transport(body, "a" * 64, "1785147330"),
            {
                "timestamp": "1785147330",
                "signature": "a6397da1d4380f3d2b329fb676e0d1f3f9577ade246114c0be794d3daf9c0bcb",
            },
        )

    def test_stored_receipt_verification(self) -> None:
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        signature = private_key.sign(self.expected["commitment"].encode("utf-8"))
        record = {
            "commitment": self.expected["commitment"],
            "commitment_hash": self.expected["commitment_hash"],
            "server_signature": base64.b64encode(signature).decode("ascii"),
            "server_public_key": base64.b64encode(
                public_key.public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
            ).decode("ascii"),
        }
        self.assertTrue(verify_stored_receipt(record)["ok"])
        tampered = dict(record)
        tampered["commitment"] += " "
        self.assertFalse(verify_stored_receipt(tampered)["ok"])

    def test_merkle_batch_fixture_and_proofs(self) -> None:
        batch = build_merkle_batch(self.batch_input)
        self.assertEqual(batch, self.expected_batch)
        for leaf in batch["leaves"]:
            self.assertTrue(
                verify_merkle_proof(
                    leaf["commitment_hash"],
                    leaf["proof"],
                    batch["merkle_root"],
                )
            )
        tampered_hash = batch["leaves"][0]["commitment_hash"][:-1] + "0"
        self.assertFalse(
            verify_merkle_proof(
                tampered_hash,
                batch["leaves"][0]["proof"],
                batch["merkle_root"],
            )
        )

    def test_merkle_batch_rejects_unknown_public_fields(self) -> None:
        unsafe = [dict(self.batch_input[0], private_key="must-never-be-published")]
        with self.assertRaisesRegex(ValueError, "missing or unknown fields"):
            build_merkle_batch(unsafe)


if __name__ == "__main__":
    unittest.main()
