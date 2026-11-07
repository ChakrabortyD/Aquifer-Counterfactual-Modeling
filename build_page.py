#!/usr/bin/env python
"""Build the standalone dashboard in docs/index.html."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "dashboard_template.html"
DATA = ROOT / "dashboard_data.json"
CSS = ROOT / "dashboard.css"
JS = ROOT / "dashboard.js"
OUT = ROOT / "docs" / "index.html"


def _embed(template: str, token: str, content: str) -> str:
    if template.count(token) != 1:
        raise ValueError(f"Expected exactly one {token} placeholder")
    return template.replace(token, content)


def render_page(template: str, data: str, css: str, js: str) -> str:
    """Embed the styles, script, and data in the template's placeholders."""
    # Parse before publishing. Disallow NaN and Infinity, which JSON.parse rejects.
    json.dumps(json.loads(data), allow_nan=False)
    page = _embed(template, "__CSS__", css)
    page = _embed(page, "__JS__", js)
    page = _embed(page, "__DATA__", data.replace("</", "<\\/"))
    return page


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check the generated page without writing it")
    args = parser.parse_args()
    page = render_page(
        TEMPLATE.read_text(encoding="utf-8"),
        DATA.read_text(encoding="utf-8"),
        CSS.read_text(encoding="utf-8"),
        JS.read_text(encoding="utf-8"),
    )

    if args.check:
        if not OUT.is_file() or OUT.read_text(encoding="utf-8") != page:
            raise SystemExit("docs/index.html is missing or stale. Run python build_page.py.")
        print("docs/index.html matches the template and data.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8", newline="\n")
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
