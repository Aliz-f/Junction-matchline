/**
 * Reads the guest favourite club after mount (FE-02).
 *
 * A hook because `localStorage` does not exist during server rendering, so the
 * first paint must not depend on it. Callers still apply the precedence rule:
 * a signed-in viewer's server favourite wins, null included.
 */
"use client";

import { useEffect, useState } from "react";
import { readGuestFavorite } from "@/lib/favorite-team";

export function useGuestFavorite(): string | null {
  const [teamId, setTeamId] = useState<string | null>(null);
  useEffect(() => {
    setTeamId(readGuestFavorite());
  }, []);
  return teamId;
}
