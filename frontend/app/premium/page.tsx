/**
 * Premium information (FE-01 shell).
 *
 * Phase 1 excludes real billing and any self-service upgrade endpoint, so this
 * route explains what the premium plan changes and deliberately offers no
 * payment or upgrade control. `/meta.capabilities.whatif_sharing` stays false
 * for all of Phase 1.
 */
import { PageHeading } from "@/components/ui/PageHeading";

export const metadata = { title: "Premium" };

export default function PremiumPage() {
  return (
    <>
      <PageHeading
        title="Premium"
        description="What the premium plan changes in Phase 1, and what it deliberately does not."
      />

      <div className="max-w-prose space-y-4 text-sm text-ink">
        <section className="rounded-lg border border-line bg-surface-raised p-4">
          <h2 className="text-base font-bold">Free accounts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
            <li>Browse the Journey, stadium map, match pages and impact.</li>
            <li>Save one favourite club.</li>
            <li>Join and post in community rooms that already exist.</li>
            <li>Make predictions before kick-off and open private What-if threads.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface-raised p-4">
          <h2 className="text-base font-bold">Premium accounts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
            <li>Everything in a free account.</li>
            <li>Create new community rooms, not only contribute to existing ones.</li>
            <li>Higher What-if thread allowances.</li>
          </ul>
        </section>

        <p role="note" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-ink-muted">
          <span className="font-semibold text-ink">No payments in Phase 1.</span> There is no checkout, no billing
          integration and no upgrade endpoint. Plan changes are made by an operator against the backend, and the
          backend remains the only authority on what an account may do.
        </p>
      </div>
    </>
  );
}
