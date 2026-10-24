/**
 * Field-by-field drift check: Appendix A schemas in `lib/api/contract.ts` vs
 * the BE-00 `backend/contracts/openapi.expected.json` snapshot. The computed
 * drift must equal the list reported in FE00_HANDOFF.md exactly, so any new
 * drift *or* a backend fix fails this test until the handoff is updated.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as C from "@/lib/api/contract";
import { repoPath } from "./helpers";

type JsonSchema = {
  $ref?: string;
  anyOf?: JsonSchema[];
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  [keyword: string]: unknown;
};

const openapi = JSON.parse(readFileSync(repoPath("backend/contracts/openapi.expected.json"), "utf8")) as {
  components: { schemas: Record<string, JsonSchema> };
};
const backendSchemas = openapi.components.schemas;

/** Backend component name -> Appendix A schema it must implement. */
const PAIRS: Record<string, z.AnyZodObject> = {
  AuthUserResponse: C.AuthMeResponse,
  CompetitionSummary: C.CompetitionSummary,
  CompetitionsResponse: C.CompetitionsResponse,
  ErrorBody: C.ErrorEnvelope.shape.error,
  ErrorEnvelope: C.ErrorEnvelope,
  FavoriteRequest: C.FavoriteTeamRequest,
  FavoriteResponse: C.FavoriteTeamResponse,
  HealthResponse: C.HealthResponse,
  LoginRequest: C.LoginRequest,
  MetaCapabilities: C.MetaView.shape.capabilities,
  MetaView: C.MetaView,
  MatchdaysResponse: C.MatchdaysResponse,
  PredictionRequest: C.PredictionRequest.innerType(),
  RegisterRequest: C.RegisterRequest,
  ReportRequest: C.ReportRequest,
  RoomCreateRequest: C.RoomCreateRequest,
  RoomMessageRequest: C.RoomMessageRequest,
  TeamSummary: C.TeamSummary,
  TeamsResponse: C.TeamsResponse,
  UserPublic: C.UserPublic,
  WhatifMessageRequest: C.WhatifMessageRequest,
  WhatifThreadRequest: C.WhatifThreadRequest,
};
/** Framework-generated or enum components with no object shape to compare. */
const IGNORED = new Set(["HTTPValidationError", "ValidationError", "Outcome", "Plan", "Role", "RoomKind"]);
/** Validation keywords Appendix A does not define for these request/response fields. */
const CONSTRAINT_KEYWORDS = ["minLength", "maxLength", "pattern", "minimum", "maximum", "exclusiveMinimum"];

const backendNullable = (schema: JsonSchema) => schema.anyOf?.some((branch) => branch.type === "null") ?? false;

function computeDrift(): string[] {
  const drift: string[] = [];
  for (const name of Object.keys(backendSchemas)) {
    if (!IGNORED.has(name) && !(name in PAIRS)) drift.push(`${name}: backend schema has no Appendix A pairing`);
  }
  for (const [name, frontend] of Object.entries(PAIRS)) {
    const backend = backendSchemas[name];
    if (!backend?.properties) {
      drift.push(`${name}: missing from backend snapshot`);
      continue;
    }
    if (backend.additionalProperties !== false) drift.push(`${name}: backend schema is not closed`);
    const shape = frontend.shape as Record<string, z.ZodTypeAny>;
    const fields = new Set([...Object.keys(shape), ...Object.keys(backend.properties)]);
    const required = new Set(backend.required ?? []);
    for (const field of [...fields].sort()) {
      const fe = shape[field];
      const be = backend.properties[field];
      if (!fe || !be) {
        drift.push(`${name}.${field}: only in ${fe ? "Appendix A" : "backend"}`);
        continue;
      }
      if (fe.isOptional() === required.has(field)) {
        drift.push(`${name}.${field}: required=${required.has(field)} but Appendix A optional=${fe.isOptional()}`);
      }
      const feNullable = fe instanceof z.ZodOptional ? fe.unwrap().isNullable() : fe.isNullable();
      if (feNullable !== backendNullable(be)) {
        drift.push(`${name}.${field}: nullable=${backendNullable(be)} but Appendix A nullable=${feNullable}`);
      }
      for (const branch of [be, ...(be.anyOf ?? [])]) {
        for (const keyword of CONSTRAINT_KEYWORDS) {
          if (keyword in branch) drift.push(`${name}.${field}: backend adds ${keyword}=${String(branch[keyword])}`);
        }
      }
    }
  }
  return drift.sort();
}

/** Reported to the backend owner in FE00_HANDOFF.md (items D1–D4). */
const KNOWN_OPENAPI_DRIFT = [
  "MetaCapabilities.whatif_sharing: required=false but Appendix A optional=false",
  "MetaView.server_now_utc: backend adds pattern=^.+Z$",
  "WhatifMessageRequest.message: backend adds maxLength=2000",
  "WhatifMessageRequest.message: backend adds minLength=10",
  "WhatifThreadRequest.title: nullable=true but Appendix A nullable=false",
].sort();

describe("OpenAPI snapshot vs Appendix A", () => {
  it("drift equals the reported list exactly", () => {
    expect(computeDrift()).toEqual(KNOWN_OPENAPI_DRIFT);
  });
});
