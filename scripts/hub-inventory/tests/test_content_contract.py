import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]


class ContentContractTests(unittest.TestCase):
    def test_ratified_operator_price_is_consistent(self):
        registry = json.loads(
            (REPO_ROOT / "data" / "registry" / "offers.json").read_text(encoding="utf-8")
        )
        operator = next(offer for offer in registry["offers"] if offer["id"] == "operator-system")

        self.assertEqual(operator["status"], "approved")
        self.assertEqual(operator["standard_price"], 5500)
        self.assertEqual(operator["current_price"], 5500)
        self.assertEqual(operator["effective_date"], "2026-07-22")

        cheat_sheet = (REPO_ROOT / "pages" / "package-cheat-sheet.html").read_text(encoding="utf-8")
        self.assertIn(
            'Operator System</td><td>$5,500 + $500/mo</td><td>4&ndash;8 weeks</td>'
            '<td>$1,000 into Scale</td><td><span class="badge ok">Approved</span>',
            cheat_sheet,
        )

    def test_scale_remains_proposed_on_seller_surfaces(self):
        cheat_sheet = (REPO_ROOT / "pages" / "package-cheat-sheet.html").read_text(encoding="utf-8")
        packages = (REPO_ROOT / "pages" / "service-packages.html").read_text(encoding="utf-8")

        self.assertIn(
            'Scale System</td><td>$10K&ndash;$15K + $1.5&ndash;2K/mo</td>'
            '<td>8&ndash;12 weeks</td><td>Custom above $15K</td>'
            '<td><span class="badge prop">Proposed</span>',
            cheat_sheet,
        )
        self.assertIn(
            '<td><span class="p-name">Scale System</span>',
            packages,
        )
        self.assertIn(
            '<strong style="color:#a1291d;">Proposed, do not quote as final:</strong> '
            'AI Jumpstart Tiers 2 and 3 ($1,999 / $2,997) · Scale',
            packages,
        )


if __name__ == "__main__":
    unittest.main()
