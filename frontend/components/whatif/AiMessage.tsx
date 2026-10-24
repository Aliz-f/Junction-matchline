/**
 * One AI analysis turn (FE-09).
 *
 * Sections are rendered in the order the spec names: verdict, headline,
 * reasoning, supports and challenges with their evidence, assumptions,
 * unknowns, qualitative confidence, sources and a follow-up question.
 *
 * Two hard limits on what this may say:
 *  - Confidence is **qualitative only** (LOW / MEDIUM). No numerical
 *    counterfactual probability is ever displayed.
 *  - The analysis is a reasoned argument about an alternative scenario, never a
 *    verified result, and the disclaimer says so.
 *
 * `model_label` distinguishes a real model response from a scripted one, and
 * `DEMO_AI` is always shown as such.
 */
import { DemoAiBadge } from "@/components/ui/SourceBadge";
import { EvidenceChip, UnsafeRef } from "./EvidenceChip";
import { resolveRefs } from "@/lib/whatif/turns";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { AIWhatifMessage } from "@/lib/api/types";

const VERDICT_LABELS: Record<AIWhatifMessage["analysis"]["verdict"], string> = {
  PLAUSIBLY_BETTER: "Plausibly better for the hypothesis",
  PLAUSIBLY_WORSE: "Plausibly worse for the hypothesis",
  NO_CLEAR_DIFFERENCE: "No clear difference",
  UNCERTAIN: "Uncertain",
  INSUFFICIENT_DATA: "Not enough evidence",
  INVALID_PREMISE: "The premise does not match the record",
};

function Claims({
  title,
  claims,
  message,
}: {
  readonly title: string;
  readonly claims: readonly { text: string; evidence_refs: string[] }[];
  readonly message: AIWhatifMessage;
}) {
  if (claims.length === 0) return null;

  return (
    <section>
      <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</h4>
      <ul className="mt-1.5 space-y-2">
        {claims.map((claim, index) => {
          const refs = resolveRefs(message, claim.evidence_refs);
          return (
            <li key={`${title}-${index}`} className="rounded-md border border-line bg-surface-sunken p-2.5">
              <p className="text-sm text-ink">{claim.text}</p>
              {refs.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {refs.map((entry) =>
                    entry.resolved ? (
                      <EvidenceChip key={entry.ref} item={entry.item} />
                    ) : (
                      <UnsafeRef key={entry.ref} ref={entry.ref} />
                    ),
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-[0.625rem] text-ink-muted">No evidence was cited for this point.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AiMessage({ message }: { readonly message: AIWhatifMessage }) {
  const { analysis } = message;
  const insufficient =
    analysis.verdict === "INSUFFICIENT_DATA" || message.validation_status === "INSUFFICIENT_DATA";

  return (
    <article className="rounded-lg border border-line bg-surface-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        {message.model_label === "DEMO_AI" ? (
          <DemoAiBadge />
        ) : (
          <span className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-muted">
            AI analysis
          </span>
        )}
        <span className="rounded bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-muted">
          {VERDICT_LABELS[analysis.verdict]}
        </span>
        <span className="text-[0.6875rem] text-ink-muted">Confidence: {analysis.confidence}</span>
        <time dateTime={machineDateTime(message.created_at)} className="ml-auto text-[0.6875rem] text-ink-muted">
          {formatKickoff(message.created_at) ?? message.created_at}
        </time>
      </div>

      <h3 className="mt-2 text-sm font-bold text-ink">{analysis.headline}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{analysis.response}</p>

      {insufficient ? (
        <p role="status" className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-200">
          <strong className="font-semibold">Not enough evidence.</strong> The feed does not contain
          what this question needs, so the missing facts are listed below rather than filled in.
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        <Claims title="Supporting evidence" claims={analysis.supports} message={message} />
        <Claims title="Conflicting evidence" claims={analysis.challenges} message={message} />

        {analysis.assumptions.length > 0 ? (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Assumptions</h4>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
              {analysis.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.unknowns.length > 0 ? (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              What is not known
            </h4>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
              {analysis.unknowns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.follow_up_questions.length > 0 ? (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              You could ask next
            </h4>
            <ul className="mt-1 space-y-1">
              {analysis.follow_up_questions.map((question) => (
                <li key={question} className="text-xs text-ink-muted">
                  {question}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {message.evidence.length > 0 ? (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              All evidence in this answer
            </h4>
            <ul className="mt-1.5 space-y-1.5">
              {message.evidence.map((item) => (
                <EvidenceChip key={item.ref} item={item} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <p className="mt-3 border-t border-line pt-2 text-[0.625rem] text-ink-muted">
        {analysis.disclaimer}
      </p>
      <p className="mt-1 text-[0.625rem] text-ink-muted">
        This is a reasoned argument about an alternative scenario. It cannot be verified, and no
        alternative result is being claimed as fact.
      </p>
    </article>
  );
}
