"""Validate the frozen documents without normalizing or changing their bytes."""

import argparse
import hashlib
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
EXPECTED = tuple(
    f"Matchline_Phase1_{side}_{kind}.md"
    for side in ("Backend", "Frontend")
    for kind in ("Codex_Spec", "Tasks")
)
APPENDIX = re.compile(rb"^## Appendix A(?:[ \t][^\r\n]*)?\r?$", re.MULTILINE)
VERSION = re.compile(
    rb"^\*\*Version:\*\*[ \t]+(?:v)?2\.4(?=[ \t\r\n]|$)", re.MULTILINE
)
REQUIRED_IDS = {f"CT-{number:02d}" for number in range(1, 23)}


def validate(root: Path, allow_missing: bool = False) -> int:
    paths = [root / "specs" / name for name in EXPECTED]
    present = [path for path in paths if path.exists()]
    missing = [path.name for path in paths if not path.exists()]
    if not present:
        print("BLOCKED: specs not yet copied")
        print("Missing: " + ", ".join(missing))
        if allow_missing:
            print("SKIPPED/BLOCKED: initial foundation exception only; G0 NOT STARTED")
            return 0
        return 1
    if missing:
        print("FAIL: incomplete spec handoff; missing: " + ", ".join(missing))
        return 1

    errors = []
    appendices = {}
    for path in paths:
        try:
            data = path.read_bytes()
            data.decode("utf-8")
        except (OSError, UnicodeError) as error:
            errors.append(f"{path.name}: unreadable UTF-8 document ({error})")
            continue
        # Version must be in the document header, before its first H2 section.
        header = re.split(rb"(?m)^##[ \t]", data, maxsplit=1)[0]
        if len(VERSION.findall(header)) != 1:
            errors.append(f"{path.name}: expected one v2.4 Version header")
        if not path.name.endswith("_Codex_Spec.md"):
            continue
        matches = list(APPENDIX.finditer(data))
        if len(matches) != 1:
            errors.append(f"{path.name}: expected exactly one '## Appendix A' heading")
            continue
        appendix = data[matches[0].start():]
        appendices[path.name] = appendix
        print(f"{path.name}: Appendix A SHA-256 {hashlib.sha256(appendix).hexdigest()}")
        sections = list(re.finditer(rb"(?m)^### A6\.[^\r\n]*\r?$", appendix))
        if len(sections) != 1:
            errors.append(f"{path.name}: expected exactly one Appendix A6 section")
            continue
        section = appendix[sections[0].end():]
        section = re.split(rb"(?m)^#{1,3}[ \t]", section, maxsplit=1)[0]
        ids = {item.decode() for item in re.findall(rb"\bCT-\d{2}\b", section)}
        missing_ids = REQUIRED_IDS - ids
        if missing_ids:
            errors.append(f"{path.name}: A6 missing IDs: {', '.join(sorted(missing_ids))}")
        else:
            print(f"{path.name}: A6 contains {', '.join(sorted(REQUIRED_IDS))}")
    if len(appendices) == 2 and len(set(appendices.values())) != 1:
        errors.append("Appendix A differs byte-for-byte (heading through EOF)")
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    print("PASS: four v2.4 headers, identical Appendix A bytes, all 22 A6 IDs present")
    print("Document alignment only; executable CT tests and G0 have not run.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bootstrap-allow-missing", action="store_true",
        help="initial foundation only: allow zero documents as SKIPPED/BLOCKED",
    )
    args = parser.parse_args()
    return validate(ROOT, args.bootstrap_allow_missing)


if __name__ == "__main__":
    raise SystemExit(main())
