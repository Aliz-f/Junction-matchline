/**
 * Room details (FE-07).
 *
 * Direct-linkable and reload-safe. A malformed UUID 404s here; the room itself
 * is fetched client-side by id so that a hidden room and an unknown id produce
 * the same not-found state, leaking nothing about whether a template exists.
 */
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { RoomDetail } from "@/components/community/RoomDetail";
import { isUuid } from "@/lib/uuid";

export const metadata = { title: "Room" };

export default async function RoomPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return (
    <>
      <PageHeading title="Community room" />
      <RoomDetail roomId={id} />
    </>
  );
}
