from __future__ import annotations

import json
import pathlib
import sys
import unittest

SDK_DIR = pathlib.Path(__file__).resolve().parent
ROOT = SDK_DIR.parents[1]
sys.path.insert(0, str(SDK_DIR))

from pom_rx import commit_pom_rx_receipt, validate_pom_rx_receipt, verify_pom_rx_chain  # noqa: E402


class PomRxVerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.vector = json.loads((ROOT / "schemas/examples/pom-rx-v0.1.cross-language.json").read_text(encoding="utf-8"))

    def test_cross_language_vector_matches_expected_hashes(self) -> None:
        self.assertEqual(verify_pom_rx_chain(self.vector["chain"]), self.vector["expected"])
        self.assertEqual(
            commit_pom_rx_receipt(self.vector["chain"][0])["receipt_hash"],
            self.vector["expected"]["receipt_hashes"][0],
        )

    def test_rejects_substitution_and_unknown_fields(self) -> None:
        altered = json.loads(json.dumps(self.vector["chain"]))
        altered[2]["policy_hash"] = "8" * 64
        result = verify_pom_rx_chain(altered)
        self.assertFalse(result["ok"])
        self.assertIn("policy_hash changed", result["error"])
        with self.assertRaisesRegex(ValueError, "missing or unknown fields"):
            validate_pom_rx_receipt({**self.vector["chain"][0], "private_key": "forbidden"})

    def test_denied_preflight_cannot_continue(self) -> None:
        denied = json.loads(json.dumps(self.vector["chain"][0]))
        denied["outcome"] = "deny"
        denied["assertions"][0]["result"] = "fail"
        self.assertTrue(verify_pom_rx_chain([denied])["ok"])
        execution = json.loads(json.dumps(self.vector["chain"][1]))
        execution["previous_receipt_hash"] = commit_pom_rx_receipt(denied)["receipt_hash"]
        result = verify_pom_rx_chain([denied, execution], allow_partial=True)
        self.assertFalse(result["ok"])
        self.assertIn("denied preflight", result["error"])


if __name__ == "__main__":
    unittest.main()
