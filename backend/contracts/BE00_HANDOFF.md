# BE-00 frontend handoff

The backend-owned sources are frozen for G0 review, not yet G0-approved.

- `demo_manifest.json`: `434c152362e5ffcdf9979ee222daed77976b54c204b94c2ab4904888b221f9b5`
- `contract_edge_cases.json`: `f2b4fff7969be31341e74ec299b594b4518916f561edff34e7165079ead7fe74`

Frontend FE-00 must copy each immutable JSON file byte-for-byte into its
specified fixture location, then independently verify these SHA-256 values and
run CT-13 validation. `openapi.expected.json` is a pre-G0 stub catalogue; it
does not represent implemented handlers. No BE-01 work may start until all
required G0 reviewers sign off.
