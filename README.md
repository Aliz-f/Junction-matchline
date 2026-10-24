# Matchline

Matchline is a planned personalized football-media platform: a match-by-match
Journey, stadium map, favorite-team impact, community rooms, deterministic
predictions, and private multi-turn user-to-AI What-if analysis with evidence and
uncertainty. Phase 1 targets the English Premier League using clearly labeled
synthetic demo data; live football data requires confirmed licensing.

The backend contains the BE-01 foundation: a FastAPI contract shell, async
SQLAlchemy/Alembic configuration, Postgres Compose service, health/meta routes,
canonical errors, and origin protection. Later feature endpoints remain explicit
contract stubs until their assigned backend task is implemented.

## One repository, independent workstreams

```text
junction-matchline/
  AGENTS.md / CLAUDE.md / CONTRIBUTING.md   shared team instructions
  backend/                                marker; human A's future service
  frontend/                               marker; human B's future application
  specs/                                  four unchanged v2.4 documents
  .github/                                PR template and bootstrap CI
  scripts/                                offline validation and hygiene
  docs/                                   ownership, evidence and gate status
```

Human C owns this initial foundation, CI and cross-stack checks. After handoff,
A owns backend plus root Compose/integration README, B owns frontend. Shared
changes need A+B review and C coordination. Names/handles remain TBD in
[TEAM_OWNERSHIP.md](docs/TEAM_OWNERSHIP.md). Read [AGENTS.md](AGENTS.md) and
[CONTRIBUTING.md](CONTRIBUTING.md) before editing. The supplied Claude imports and
starter documents are preserved.

## Spec handoff and checks

All four files are already present and must remain unchanged:

- `specs/Matchline_Phase1_Backend_Codex_Spec.md`
- `specs/Matchline_Phase1_Backend_Tasks.md`
- `specs/Matchline_Phase1_Frontend_Codex_Spec.md`
- `specs/Matchline_Phase1_Frontend_Tasks.md`

For a fresh checkout missing the package, obtain the four original v2.4 files
from the team and copy them under these exact paths in one handoff. Do not
overwrite existing documents or normalize their bytes. Run strict validation
before review, commit or BE-00/FE-00 work:

```sh
python3 scripts/check_specs.py
python3 -m unittest discover -s scripts -p 'test_*.py' -v
python3 -m compileall -q scripts
python3 scripts/check_hygiene.py
git diff --check
```

The stdlib validator checks the four version headers, exact Appendix A bytes
from heading through EOF, SHA-256 and CT-01–CT-22 presence inside each A6 section.
It does not run those application tests or award G0. Only for an initial
foundation with **zero** documents, `python3 scripts/check_specs.py
--bootstrap-allow-missing` may exit zero with SKIPPED/BLOCKED. A partial handoff
always fails. With no documents, record: **SPEC HANDOFF BLOCKED — four v2.4 files
must be copied unchanged**. CI skips its Spec alignment job when all are absent,
fails a partial handoff, and uses strict validation when all are present.

Hygiene scans tracked and nonignored new files for LF/final newlines and a small
set of recognizable credential patterns; it is not a comprehensive security
audit. It reports filenames without printing matched secret values. Existing
Markdown double spaces are intentional and preserved.

## Initial commit and separate worktrees

Local Git is initialized on `main`; no commit, remote, push, branch protection
or CODEOWNERS assignment has been made. Review this foundation with A+B+C first.
Then these are suggested commands for a human to run, **not commands executed by
bootstrap**:

```sh
cd /home/alireza/aliz_projects/junction-matchline
python3 scripts/check_specs.py
git status --short
git add AGENTS.md CLAUDE.md CONTRIBUTING.md README.md README_START_HERE.md CODEX_BOOTSTRAP_PROMPT.md .editorconfig .gitattributes .gitignore .github docs scripts specs backend/.gitkeep frontend/.gitkeep
git diff --cached --stat
git diff --cached --check
git commit -m "chore: establish Matchline repository foundation"
git worktree add -b feat/be-00-contract ../junction-matchline-backend main
git worktree add -b feat/fe-00-mocks ../junction-matchline-frontend main
git worktree list
```

The two sibling paths and branch names must be unused. Never delete an existing
directory or branch to make these commands succeed. Review staged contents for
secrets before committing. The supplied specs contain intentional Markdown hard
breaks; investigate any whitespace finding without silently rewriting specs.

Open separate editor/agent sessions in these paths:

```sh
# Backend session: read all four docs, then assign BE-00 only.
cd /home/alireza/aliz_projects/junction-matchline-backend
python3 scripts/check_specs.py

# Frontend session: read all four docs, then assign FE-00 only.
cd /home/alireza/aliz_projects/junction-matchline-frontend
python3 scripts/check_specs.py
```

BE-00 creates the minimal Pydantic/OpenAPI shell and canonical demo manifest and
edge corpus. FE-00 may prepare its typed mock shell in parallel, but must receive
the reviewed, committed BE-00 artifacts and mirror their hashes before completion.
C coordinates integration of that backend revision and its availability in the
frontend worktree under the team's merge policy. Do not invent fixture IDs to
work around the dependency. A+B+C review G0; only afterward may BE-01/FE-01 start.
Never let two agents edit the same worktree simultaneously.

## Backend local development

Backend requires Python 3.12+, PostgreSQL 16+, and a local secret file that is
ignored by Git. Start from `backend/.env.example`, set a local database password,
then run:

```sh
docker compose up -d postgres
cd backend
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.lock
alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000/api/v1/health`, with interactive
documentation at `http://localhost:8000/docs`. Browser writes must supply the
configured exact `Origin` header; CORS is not relied on for CSRF protection.
`/api/v1/meta` intentionally reports only implemented capabilities. Remote AI
credentials stay server-side and its G4 acceptance remains BLOCKED until they
are provisioned.

See [INTEGRATION_STATUS.md](docs/INTEGRATION_STATUS.md) for actual local evidence
and [the manual GitHub checklist](docs/TEAM_OWNERSHIP.md#github-setup-checklist-manual-not-configured)
for review/CI protection settings after remote access is authorized.

## Container deployment

Copy `.env.example` to `.env`, replace `MATCHLINE_POSTGRES_PASSWORD`, and set
`MATCHLINE_FRONTEND_ORIGIN` to the public HTTPS origin. Set
`SESSION_COOKIE_SECURE=true` for HTTPS. Then start the complete stack:

```sh
docker compose up --build -d
```

Only the Next.js service is exposed on port 3000. It proxies browser `/api/v1`
requests to the internal API service; PostgreSQL and FastAPI remain private to
the Compose network. The one-shot `migrate` service runs Alembic before the API
starts. CI validates backend/frontend checks and builds these images, but does
not publish images or deploy without an approved registry and target.
