"""One-off helper: replace url_for('static', ...) with static_v(...) in templates."""
import re
from pathlib import Path

PATTERN = re.compile(
    r"\{\{\s*url_for\('static',\s*filename=(['\"])([^'\"]+)\1\)\s*\}\}(?:\?v=[^\"'\s>]+)?"
)

ROOT = Path(__file__).resolve().parents[1] / "templates"


def main() -> None:
    changed = []
    for path in sorted(ROOT.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        new = PATTERN.sub(lambda m: "{{ static_v('" + m.group(2) + "') }}", text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"Updated {len(changed)} files")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
