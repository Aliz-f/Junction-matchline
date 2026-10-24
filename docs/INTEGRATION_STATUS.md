# Integration status

Recorded 2026-10-24 for the integration/bootstrap foundation slice. Human names,
review approvals and commit/PR references remain unassigned. Local evidence is
not a substitute for human sign-off or a hosted CI run.

| Stage | Status | Evidence / prerequisites |
|---|---|---|
| Bootstrap | PASS (local foundation checks only) | Files created; strict spec check, eight validator tests, Python syntax, YAML syntax and limited hygiene checks passed; review/initial commit pending |
| G0 | NOT STARTED | Requires BE-00, FE-00, matching manifests/corpus/OpenAPI, CT-13 execution and A+B+C review |
| G1 | NOT STARTED | Requires G0 and real core experience integration |
| G2 | NOT STARTED | Requires discovery/community integration and FREE/PREMIUM account handoff |
| G3 | NOT STARTED | Requires predictions, settlement and profile integration |
| G4 | NOT STARTED | Requires private multi-turn What-if integration and remote-model evidence |
| G5 | NOT STARTED | Requires prior gates, full contract and release integration checks |

## Local validation evidence

Environment: Linux, Python 3.11.5; stdlib scripts need no installed app packages.
The future backend still requires Python 3.12+; bootstrap CI targets 3.12.

| Command | Result | Observed output |
|---|---|---|
| `python3 scripts/check_specs.py` | PASS | Four v2.4 headers; identical Appendix A bytes; both A6 sections contain CT-01 through CT-22 |
| `python3 -m unittest discover -s scripts -p 'test_*.py' -v` | PASS | Ran 8 tests; OK (absence, partial package, version, byte/newline drift, section boundaries, missing/duplicate headings) |
| `python3 -m compileall -q scripts` | PASS | Exit 0 |
| `python3 scripts/check_hygiene.py` | PASS | LF/final-newline and limited credential-pattern scan |
| `git diff --check` | PASS | Exit 0; no tracked diff before initial staging, so new-file checks also required |
| `git diff --no-index --check /dev/null <file>` for each new/modified foundation text file | PASS | No whitespace diagnostics; exit 1 for added-file differences accepted, errors/diagnostics rejected; supplied specs excluded to preserve original Markdown |
| `python3 -c 'from pathlib import Path; import yaml; data = yaml.safe_load(Path(".github/workflows/bootstrap.yml").read_text()); assert "jobs" in data; print("PASS: workflow YAML syntax (PyYAML)")'` | PASS | Workflow YAML parsed with already-installed PyYAML; not hosted Actions execution |
| Ruff availability (`importlib.util.find_spec("ruff")`) | BLOCKED | Not installed; no dependencies installed by bootstrap |

Both Appendix A blocks (heading through EOF) have SHA-256:

```text
bb9c9e0497db97b4a889ee31c59aa810243073f1101c359298f9854b5ecd480d
```

All 22 CT identifiers are present, **not executed**. No API/schema, DTO, fixture,
application or database change was made. All four supplied specs remain unchanged.
Final `sha256sum specs/*.md CLAUDE.md README_START_HERE.md CODEX_BOOTSTRAP_PROMPT.md`
matched the pre-edit hashes for every supplied file listed. Ignore-rule checks
confirmed local env/venv/node/IDE paths are ignored while agent rules, specs and
`.env.example` / `.env.local.example` remain eligible for version control.

## Blocks and handoff

- No missing spec documents. Preserve the complete original package; do not
  regenerate, shorten or normalize it. Appendix A is the normative contract.
- BE-00 and FE-00: NOT STARTED. After foundation review and initial commit, A and
  B use separate worktrees; FE-00 waits for BE-00's committed canonical artifacts
  before freezing fixtures/hashes. Exact commands are in the root README.
- A+B review the appended shared process clarifications; C coordinates foundation
  handoff. No reviewer, sign-off, commit or PR has been fabricated.
- No remote or hosted CI execution; GitHub protection and CODEOWNERS are not
  configured. Follow the manual checklist after authorization and verified handles.
- Future backend Python 3.12+ execution and application lint/type/tests have not
  run. Provider licensing and live remote-model credentials remain future external
  dependencies; absent credentials must not be recorded as live-model PASS.
- Next allowed work after foundation review/commit: pre-G0 BE-00/FE-00 only.

Bootstrap complete; BE-00/FE-00 and G0 have not started.
