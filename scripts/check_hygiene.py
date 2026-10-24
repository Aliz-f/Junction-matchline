"""Small offline hygiene check; not a comprehensive secret scanner."""

from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".md", ".py", ".ts", ".tsx", ".js", ".json", ".yml", ".yaml", ".sh", ".toml"}
SECRET_PATTERNS = (
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"\bgh[pousr]_[A-Za-z0-9]{36,}\b",
    rb"\bgithub_pat_[A-Za-z0-9_]{60,}\b",
    rb"\bAKIA[0-9A-Z]{16}\b",
    rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b",
)


def main() -> int:
    names = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT,
    ).decode().split("\0")
    failures = []
    for name in sorted(set(names) - {""}):
        path = ROOT / name
        if not path.is_file() or path.is_symlink():
            continue
        if (path.name == ".env" or path.name.startswith(".env.")) and not name.endswith(".example"):
            failures.append(f"{name}: environment file must not be tracked")
        if path.suffix in {".pem", ".key", ".p12", ".pfx"} or any(
            part in {".aws", ".ssh"} for part in path.parts
        ) or path.name == "credentials.json":
            failures.append(f"{name}: credential file must not be tracked")
        data = path.read_bytes()
        if path.suffix in TEXT_SUFFIXES or path.name in {".editorconfig", ".gitignore", ".gitattributes"}:
            if b"\r" in data:
                failures.append(f"{name}: non-LF line ending")
            if data and not data.endswith(b"\n"):
                failures.append(f"{name}: missing final newline")
        if any(re.search(pattern, data) for pattern in SECRET_PATTERNS):
            # Never print matched values.
            failures.append(f"{name}: possible credential detected; inspect privately")
    for failure in failures:
        print(f"FAIL: {failure}")
    if failures:
        return 1
    print("PASS: LF/final-newline checks and limited credential-pattern scan")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
