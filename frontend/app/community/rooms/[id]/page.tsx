/**
 * Room details (FE-07) — FE-01 shell only.
 *
 * `/community/rooms/[id]` is direct-linkable and reload-safe per FE-01. A
 * malformed UUID 404s, and in demo mode an id absent from the frozen manifest
 * 404s. Messages, permissions and the change feed need the backend: posting
 * rights, cutoffs and moderation are never decided on the client.
 */
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { PlannedSurface } from "@/components/ui/PlannedSurface";
import { dataMode } from "@/lib/demo/mode";
import { demoRoomIds } from "@/lib/demo/responses";
import { isUuid } from "@/lib/uuid";

export const metadata = { title: "Room" };

export default async function RoomPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (dataMode() === "DEMO_FIXTURES" && !demoRoomIds().has(id)) notFound();

  return (
    <>
      <PageHeading title="Community room" />
      <PlannedSurface
        task="FE-07"
        gate="G2"
        title="Room messages, permissions and reporting"
        summary="The message feed with ordered incremental changes, server-decided posting rights, room cutoff, reporting and the public redaction contract. A read-only room after kick-off is shown as read-only, not as a failed post."
        needs={["GET /rooms/{id}", "GET /rooms/{id}/changes", "POST /rooms/{id}/messages"]}
      />
    </>
  );
}
