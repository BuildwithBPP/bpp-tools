"""Regression tests for the Hub inventory generators."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]


def load_module(name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPT_DIR / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class SkillsGeneratorTests(unittest.TestCase):
    def test_discovers_safe_skill_metadata_and_classifies_roots(self):
        generator = load_module("generate_skills")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            bpp = root / "bpp" / "discovery-call-prep"
            system = root / "system" / "internal-helper"
            bpp.mkdir(parents=True)
            system.mkdir(parents=True)
            (bpp / "SKILL.md").write_text(
                "---\nname: discovery-call-prep\ndescription: Prepare a decision-ready call brief\n---\n"
                "# Secret instructions\nAPI_KEY=do-not-publish\n",
                encoding="utf-8",
            )
            (system / "SKILL.md").write_text("# Internal Helper\n\nNever publish this body.", encoding="utf-8")
            output = root / "skills.json"

            generator.generate(
                roots=[("bpp-built", bpp.parent), ("system-provided", system.parent)],
                output_path=output,
                generated_at="2026-07-29T12:00:00Z",
            )

            data = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(data["schema_version"], 1)
            self.assertEqual(len(data["skills"]), 2)
            self.assertEqual(data["skills"][0]["classification"], "bpp-built")
            self.assertNotIn("API_KEY", output.read_text(encoding="utf-8"))
            self.assertNotIn(str(root), output.read_text(encoding="utf-8"))


class BuildsGeneratorTests(unittest.TestCase):
    def test_reports_repo_and_plugin_metadata_without_commit_messages_or_paths(self):
        generator = load_module("generate_builds")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo = root / "example-repo"
            repo.mkdir()
            (repo / "plugin.json").write_text('{"name":"example-plugin","version":"1.2.3"}', encoding="utf-8")
            subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
            (repo / "README.md").write_text("fixture", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-m", "Sensitive client launch details"], cwd=repo, check=True, capture_output=True)
            output = root / "builds-snapshot.json"

            generator.generate(
                repo_roots=[repo],
                skill_inventory_path=None,
                output_path=output,
                generated_at="2026-07-29T12:00:00Z",
            )

            raw = output.read_text(encoding="utf-8")
            data = json.loads(raw)
            self.assertEqual(data["repositories"][0]["name"], "example-repo")
            self.assertEqual(data["repositories"][0]["recent_commit_count"], 1)
            self.assertEqual(data["plugins"][0]["name"], "example-plugin")
            self.assertNotIn("Sensitive client launch details", raw)
            self.assertNotIn(str(root), raw)


if __name__ == "__main__":
    unittest.main()
