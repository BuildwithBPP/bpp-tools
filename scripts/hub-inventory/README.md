# Hub inventory generators

These generators create the safe snapshots consumed by the Skill Dictionary and What We Built pages. They use Python's standard library only and work on Windows and macOS.

The output intentionally contains display metadata, counts, commit identifiers, and commit dates only. It does not include SKILL.md instruction bodies, local source paths, secrets, or Git commit messages.

## Generate skills

```powershell
python scripts/hub-inventory/generate_skills.py `
  --skills-root "bpp-built=C:\path\to\workspace\_claude\skills" `
  --skills-root "system-provided=C:\path\to\system-skills" `
  --output data/generated/skills.json
```

Each `--skills-root` is `classification=path`. Valid classifications are `bpp-built`, `bpp-customized`, `third-party`, and `system-provided`. A missing root is reported as unavailable, not treated as empty.

## Generate builds

```powershell
python scripts/hub-inventory/generate_builds.py `
  --repo-root . `
  --repo-root C:\path\to\other-repositories `
  --skills-json data/generated/skills.json `
  --output data/generated/builds-snapshot.json
```

`--repo-root` accepts either a Git repository or a directory whose immediate children are repositories. The snapshot reports only repository names, commit counts, latest commit short IDs and dates, plugin-manifest names and versions, and the generated Skill Directory summary.

## Test

```powershell
python -m unittest scripts/hub-inventory/tests/test_generators.py
```

Refresh with `python scripts/refresh_hub.py` after configuring the local roots. A weekly scheduled task is appropriate, with an additional run after a skill or plugin change.
