"""Generate a safe What We Built snapshot from local repositories and manifests."""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def git_output(repo: Path, *args: str) -> str:
    result = subprocess.run(["git", "-C", str(repo), *args], text=True, capture_output=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else ""


def discover_repos(roots: Iterable[Path]) -> list[Path]:
    repos: list[Path] = []
    for root in roots:
        root = Path(root)
        candidates = [root] if (root / ".git").exists() else list(root.iterdir()) if root.is_dir() else []
        repos.extend(candidate for candidate in candidates if candidate.is_dir() and (candidate / ".git").exists())
    return sorted({repo.resolve() for repo in repos}, key=lambda item: item.name.lower())


def plugins_for(repo: Path) -> list[dict]:
    plugins: list[dict] = []
    candidates = [repo / "plugin.json", repo / ".claude-plugin" / "plugin.json"]
    for path in candidates:
        if not path.is_file():
            continue
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        name = str(manifest.get("name") or repo.name).strip()
        if name:
            plugins.append({"name": name, "version": str(manifest.get("version") or "unversioned"), "repository": repo.name})
    return plugins


def skill_summary(path: Path | None) -> dict:
    if not path or not path.is_file():
        return {"status": "unavailable"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"status": "unavailable"}
    counts: dict[str, int] = {}
    for skill in data.get("skills", []):
        classification = str(skill.get("classification", "unclassified"))
        counts[classification] = counts.get(classification, 0) + 1
    return {"status": "available", "skill_count": len(data.get("skills", [])), "by_classification": counts}


def generate(repo_roots: Iterable[Path], skill_inventory_path: Path | None, output_path: Path, generated_at: str | None = None) -> dict:
    repositories = []
    plugins: list[dict] = []
    for repo in discover_repos(repo_roots):
        recent_count = git_output(repo, "rev-list", "--count", "--since=30.days", "HEAD")
        latest = git_output(repo, "log", "-1", "--format=%h|%aI")
        latest_commit = None
        if "|" in latest:
            short_id, date = latest.split("|", 1)
            latest_commit = {"id": short_id, "date": date}
        repositories.append({
            "name": repo.name,
            "status": "available",
            "recent_commit_count": int(recent_count or 0),
            "latest_commit": latest_commit,
        })
        plugins.extend(plugins_for(repo))
    data = {
        "schema_version": 1,
        "generated_at": generated_at or now_iso(),
        "source": "Local Git metadata and plugin manifests",
        "freshness_days": 7,
        "repositories": repositories,
        "plugins": sorted(plugins, key=lambda item: (item["name"].lower(), item["repository"].lower())),
        "skill_inventory": skill_summary(skill_inventory_path),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a safe Hub build inventory JSON snapshot.")
    parser.add_argument("--repo-root", action="append", type=Path, default=[], help="A Git repository or directory containing repositories.")
    parser.add_argument("--skills-json", type=Path, help="Generated skills.json to summarize.")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--generated-at", help="ISO-8601 timestamp, useful for reproducible builds.")
    args = parser.parse_args()
    generate(args.repo_root, args.skills_json, args.output, args.generated_at)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
