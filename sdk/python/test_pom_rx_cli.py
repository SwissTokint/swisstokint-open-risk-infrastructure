from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
CLI = ROOT / "scripts" / "verify-pom-rx-v0.1.py"
VECTOR = ROOT / "schemas" / "examples" / "pom-rx-v0.1.cross-language.json"


class PomRxCliTests(unittest.TestCase):
    def test_cli_accepts_the_shared_cross_language_vector(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(CLI), str(VECTOR)],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout), json.loads(VECTOR.read_text(encoding="utf-8"))["expected"])

    def test_cli_rejects_duplicate_json_keys_before_chain_validation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            fixture = pathlib.Path(directory) / "duplicate.json"
            fixture.write_text('{"chain":[],"chain":[]}', encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(CLI), str(fixture)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(completed.returncode, 2, completed.stderr)
        result = json.loads(completed.stdout)
        self.assertFalse(result["ok"])
        self.assertIn("duplicate key", result["error"])


if __name__ == "__main__":
    unittest.main()
