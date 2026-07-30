"""Tests for Performance Dashboard source validation and safe HTML data embedding."""
from __future__ import annotations

import importlib.util
import os
import tempfile
import time
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]


def load_utils():
    spec = importlib.util.spec_from_file_location("build_utils", SCRIPT_DIR / "build_utils.py")
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class BuildUtilsTests(unittest.TestCase):
    def test_validates_financial_and_social_freshness_independently(self):
        utils = load_utils()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            financial, social = root / "financial", root / "social"
            financial.mkdir(); social.mkdir()
            for name in ("monthly-pnl.csv", "account-by-month.csv", "transactions-all.csv"):
                (financial / name).write_text("x", encoding="utf-8")
            social_file = social / "instagram-daily-fixture.csv"
            social_file.write_text("x", encoding="utf-8")
            now = time.time()
            for file in financial.iterdir(): os.utime(file, (now - 86400 * 40, now - 86400 * 40))
            os.utime(social_file, (now - 86400, now - 86400))

            with self.assertRaisesRegex(ValueError, "Financial source family is stale"):
                utils.validate_source_families(financial, social, 31, now=now)
            for file in financial.iterdir(): os.utime(file, (now - 86400, now - 86400))
            os.utime(social_file, (now - 86400 * 40, now - 86400 * 40))
            with self.assertRaisesRegex(ValueError, "Social source family is stale"):
                utils.validate_source_families(financial, social, 31, now=now)

    def test_serialization_escapes_script_breakout_and_validates_month_schema(self):
        utils = load_utils()
        payload = {"months": ["2026-07"], "data": {"2026-07": {"note": "</script><script>alert(1)</script>"}}}

        serialized = utils.serialize_for_script(payload)

        self.assertIn("<\\/script>", serialized)
        self.assertNotIn("</script>", serialized)
        utils.validate_month_schema(payload)
        with self.assertRaisesRegex(ValueError, "Invalid month key"):
            utils.validate_month_schema({"months": ["July 2026"], "data": {"July 2026": {}}})


if __name__ == "__main__":
    unittest.main()
