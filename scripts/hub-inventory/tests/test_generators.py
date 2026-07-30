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

    def test_redacts_absolute_paths_from_overrides_and_is_byte_stable_with_a_fixed_timestamp(self):
        generator = load_module("generate_skills")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skill = root / "skill"
            skill.mkdir()
            (skill / "SKILL.md").write_text("---\nname: path-safe\ndescription: Safe metadata\n---\n", encoding="utf-8")
            overrides = {"path-safe": {"description": "See C:\\Users\\someone\\secret and /Users/someone/private", "status": "Stored at /opt/private"}}
            one, two = root / "one.json", root / "two.json"

            generator.generate([("bpp-built", root)], one, "2026-07-29T12:00:00Z", overrides)
            generator.generate([("bpp-built", root)], two, "2026-07-29T12:00:00Z", overrides)

            raw = one.read_text(encoding="utf-8")
            self.assertEqual(raw, two.read_text(encoding="utf-8"))
            self.assertNotIn("C:\\Users", raw)
            self.assertNotIn("/Users/someone", raw)
            self.assertNotIn("/opt/private", raw)


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
            env = {**__import__("os").environ, "GIT_AUTHOR_DATE": "2026-07-20T12:00:00Z", "GIT_COMMITTER_DATE": "2026-07-20T12:00:00Z"}
            subprocess.run(["git", "add", "."], cwd=repo, check=True, env=env)
            subprocess.run(["git", "commit", "-m", "Sensitive client launch details"], cwd=repo, check=True, capture_output=True, env=env)
            output = root / "builds-snapshot.json"

            generator.generate(
                repo_roots=[repo],
                skill_inventory_path=None,
                output_path=output,
                generated_at="2026-07-29T12:00:00Z",
                as_of="2026-07-29T12:00:00Z",
            )

            raw = output.read_text(encoding="utf-8")
            data = json.loads(raw)
            self.assertEqual(data["repositories"][0]["name"], "example-repo")
            self.assertEqual(data["repositories"][0]["recent_commit_count"], 1)
            self.assertEqual(data["plugins"][0]["name"], "example-plugin")
            self.assertNotIn("Sensitive client launch details", raw)
            self.assertNotIn(str(root), raw)

    def test_fixed_as_of_makes_the_build_snapshot_byte_stable(self):
        generator = load_module("generate_builds")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo = root / "stable-repo"
            repo.mkdir()
            subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
            (repo / "README.md").write_text("fixture", encoding="utf-8")
            env = {**__import__("os").environ, "GIT_AUTHOR_DATE": "2026-07-20T12:00:00Z", "GIT_COMMITTER_DATE": "2026-07-20T12:00:00Z"}
            subprocess.run(["git", "add", "."], cwd=repo, check=True, env=env)
            subprocess.run(["git", "commit", "-m", "Fixture"], cwd=repo, check=True, capture_output=True, env=env)
            one, two = root / "one.json", root / "two.json"

            generator.generate([repo], None, one, "2026-07-29T12:00:00Z", as_of="2026-07-29T12:00:00Z")
            generator.generate([repo], None, two, "2026-07-29T12:00:00Z", as_of="2026-07-29T12:00:00Z")

            self.assertEqual(one.read_bytes(), two.read_bytes())
            self.assertEqual(json.loads(one.read_text(encoding="utf-8"))["repositories"][0]["recent_commit_count"], 1)


if __name__ == "__main__":
    unittest.main()
