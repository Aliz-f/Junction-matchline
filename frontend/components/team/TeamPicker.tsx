/**
 * Favourite-team picker (FE-02).
 *
 * Searchable, one team at a time. A crest is optional: the manifest carries no
 * licensed crest, so the accessible fallback is an initials monogram rather
 * than a broken image or a copied badge.
 *
 * Persistence differs by viewer and is the caller's job:
 *  - guest  -> `localStorage` under `matchline:favorite_team_id:v1`
 *  - signed in -> `PUT /users/me/favorite-team`, the server being authoritative
 */
"use client";

import { useMemo, useState } from "react";
import type { TeamSummary } from "@/lib/api/types";

type Props = {
  readonly teams: readonly TeamSummary[];
  readonly selectedTeamId: string | null;
  readonly onSelect: (teamId: string) => void;
  readonly isSaving?: boolean;
};

function Monogram({ team }: { readonly team: TeamSummary }) {
  const initials = team.short_name
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken
                 text-xs font-bold text-ink-muted"
    >
      {initials}
    </span>
  );
}

export function TeamPicker({ teams, selectedTeamId, onSelect, isSaving = false }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(needle) || team.short_name.toLowerCase().includes(needle),
    );
  }, [teams, search]);

  return (
    <div>
      <label htmlFor="team-search" className="block text-sm font-semibold text-ink">
        Find your club
      </label>
      <input
        id="team-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search clubs"
        autoComplete="off"
        className="mt-1.5 w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
      />

      {filtered.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-ink-muted">
          No club matches &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {filtered.map((team) => {
            const isSelected = team.id === selectedTeamId;
            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => onSelect(team.id)}
                  disabled={isSaving}
                  aria-pressed={isSelected}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-ink bg-surface-sunken"
                      : "border-line bg-surface-raised hover:bg-surface-sunken",
                  ].join(" ")}
                >
                  {team.crest_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- crest host is not known ahead of time, so the Image loader cannot be configured for it
                    <img src={team.crest_url} alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
                  ) : (
                    <Monogram team={team} />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{team.short_name}</span>
                    {team.name !== team.short_name ? (
                      <span className="block truncate text-xs text-ink-muted">{team.name}</span>
                    ) : null}
                  </span>
                  {isSelected ? <span className="ml-auto text-xs font-bold text-ink">Selected</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
