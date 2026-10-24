# Team ownership

| Role | Name | Verified GitHub handle | Responsibility and paths |
|---|---|---|---|
| A — Backend lead | TBD | TBD | `backend/**`; root `docker-compose.yml` and integration `README.md` after foundation handoff |
| B — Frontend lead | TBD | TBD | `frontend/**`, including `frontend/README.md` |
| C — Integration/QA coordinator | TBD | TBD | Initial bootstrap, `.github/**`, cross-stack `scripts/**`, shared process documents, G0–G5 coordination |

Replace TBD only after all three humans confirm real names and handles. Agents
are tools of these people, not additional reviewers or signatories. Both A and B
review shared/protected changes; C coordinates approval and records gate evidence.
Use independent branches and Git worktrees for backend/frontend; never run two
editing agents in the same worktree.

## GitHub setup checklist (manual, not configured)

- [ ] Obtain authorization to create/connect the GitHub repository and push.
- [ ] Confirm `main` is the integration/default branch.
- [ ] Require pull requests, at least one other human approval, resolved review
  conversations and successful CI; dismiss stale approvals on new commits.
- [ ] After CI has run, select `Foundation hygiene` and `Spec alignment` as
  required checks. Require strict spec alignment once the four files are present.
- [ ] Disallow force pushes and deletion of `main`; agree on bypass permissions.
- [ ] Add `.github/CODEOWNERS` only with verified handles: A for backend and root
  integration files, B for frontend, C for CI/scripts; shared paths list A/B/C.
  Enable code-owner review after verifying repository access.
- [ ] Enforce A+B review and C coordination for shared/API changes through the
  team review process. Multiple CODEOWNERS entries alone do not require every
  listed owner to approve.

No remote, branch protection, CODEOWNERS assignment or human approval is asserted
by this document.
