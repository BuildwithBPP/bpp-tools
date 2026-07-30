"""Generate a safe, portable Skill Directory snapshot from SKILL.md metadata."""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


VALID_CLASSIFICATIONS = {"bpp-built", "bpp-customized", "third-party", "system-provided"}
SENSITIVE_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*\S+"),
    re.compile(r"(?i)bearer\s+\S+"),
)
ABSOLUTE_PATH_PATTERNS = (
    re.compile(r"(?i)(?<![A-Za-z0-9])[A-Z]:[\\/][^\s,;]+"),
    re.compile(r"(?<![:/A-Za-z0-9])/(?:[^\s/]+/)+[^\s,;]+"),
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_text(value: object, limit: int = 240) -> str:
    text = " ".join(str(value or "").split())
    for pattern in SENSITIVE_PATTERNS:
        text = pattern.sub("[redacted]", text)
    for pattern in ABSOLUTE_PATH_PATTERNS:
        text = pattern.sub("[redacted path]", text)
    return text[:limit].rstrip()


def frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    values: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip().lower()] = value.strip().strip("\"'")
    return values


def display_record(path: Path, classification: str, overrides: dict[str, dict]) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    metadata = frontmatter(text)
    skill_id = safe_text(metadata.get("name") or path.parent.name, 100)
    override = overrides.get(skill_id, {})
    title = safe_text(override.get("title") or skill_id.replace("-", " ").replace("_", " ").title(), 140)
    description = safe_text(override.get("description") or metadata.get("description") or "Skill metadata is available in the workspace.")
    record = {
        "id": skill_id,
        "title": title,
        "description": description,
        "classification": classification,
        "source": "SKILL.md metadata",
        "availability": "available",
    }
    if override.get("status"):
        record["status"] = safe_text(override["status"], 40)
    return record


def generate(roots: Iterable[tuple[str, Path]], output_path: Path, generated_at: str | None = None, overrides: dict[str, dict] | None = None) -> dict:
    """Write a public-safe inventory without instruction bodies or source paths."""
    overrides = overrides or {}
    records: list[dict] = []
    unavailable: list[dict] = []
    for classification, root in roots:
        if classification not in VALID_CLASSIFICATIONS:
            raise ValueError(f"Unsupported classification: {classification}")
        root = Path(root)
        if not root.is_dir():
            unavailable.append({"classification": classification, "status": "unavailable"})
            continue
        for path in root.rglob("SKILL.md"):
            records.append(display_record(path, classification, overrides))
    unique = {f"{record['classification']}:{record['id']}": record for record in records}
    skills = sorted(unique.values(), key=lambda item: (item["classification"], item["title"].lower()))
    data = {
        "schema_version": 1,
        "generated_at": generated_at or now_iso(),
        "source": "Local SKILL.md metadata scan",
        "freshness_days": 7,
        "skill_count": len(skills),
        "skills": skills,
        "unavailable_sources": unavailable,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return data


def parse_root(value: str) -> tuple[str, Path]:
    try:
        classification, raw_path = value.split("=", 1)
    except ValueError as error:
        raise argparse.ArgumentTypeError("Use CLASSIFICATION=PATH for --skills-root.") from error
    return classification, Path(raw_path).expanduser()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a safe Hub Skill Directory JSON snapshot.")
    parser.add_argument("--skills-root", action="append", type=parse_root, default=[], metavar="CLASSIFICATION=PATH")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--overrides", type=Path, help="Optional display-only JSON overrides keyed by skill id.")
    parser.add_argument("--generated-at", help="ISO-8601 timestamp, useful for reproducible builds.")
    args = parser.parse_args()
    overrides = json.loads(args.overrides.read_text(encoding="utf-8")) if args.overrides else {}
    generate(args.skills_root, args.output, args.generated_at, overrides)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
