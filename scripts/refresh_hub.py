"""Single local entry point for refreshing safe Hub inventories."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INVENTORY_DIR = REPO_ROOT / "scripts" / "hub-inventory"


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh the Skill Directory and What We Built snapshots.")
    parser.add_argument("--skills-root", action="append", default=[], metavar="CLASSIFICATION=PATH")
    parser.add_argument("--workspace-root", type=Path, help="BPP workspace root. Adds _claude/skills as bpp-built.")
    parser.add_argument("--repo-root", action="append", type=Path, default=[], help="Git repository or directory containing repositories.")
    parser.add_argument("--output-dir", type=Path, default=REPO_ROOT / "data" / "generated")
    parser.add_argument("--generated-at", help="ISO-8601 timestamp for reproducible snapshots.")
    parser.add_argument("--as-of", help="ISO-8601 cutoff for the generated build snapshot.")
    args = parser.parse_args()

    skill_roots = list(args.skills_root)
    if args.workspace_root:
        skill_roots.append(f"bpp-built={args.workspace_root / '_claude' / 'skills'}")
    skills_json = args.output_dir / "skills.json"
    builds_json = args.output_dir / "builds-snapshot.json"
    skills_cmd = [sys.executable, str(INVENTORY_DIR / "generate_skills.py"), "--output", str(skills_json)]
    for root in skill_roots:
        skills_cmd.extend(["--skills-root", root])
    if args.generated_at:
        skills_cmd.extend(["--generated-at", args.generated_at])
    subprocess.run(skills_cmd, check=True)

    build_cmd = [
        sys.executable, str(INVENTORY_DIR / "generate_builds.py"),
        "--skills-json", str(skills_json),
        "--output", str(builds_json),
    ]
    for root in args.repo_root or [REPO_ROOT]:
        build_cmd.extend(["--repo-root", str(root)])
    if args.generated_at:
        build_cmd.extend(["--generated-at", args.generated_at])
    if args.as_of:
        build_cmd.extend(["--as-of", args.as_of])
    subprocess.run(build_cmd, check=True)

    for path in (skills_json, builds_json):
        with path.open(encoding="utf-8") as handle:
            json.load(handle)
    print(f"Refreshed and validated {skills_json.name} and {builds_json.name}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
