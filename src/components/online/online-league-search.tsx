"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { OnlineLeague } from "@/lib/online/online-league-types";
import { getOnlineRecoveryCopy } from "@/lib/online/error-recovery";
import { getOnlineLeagueRepository } from "@/lib/online/online-league-repository-provider";
import {
  resolveTeamIdentitySelection,
  getTeamNamesByCategory,
  TEAM_IDENTITY_CITIES,
  TEAM_NAME_CATEGORIES,
  TEAM_NAME_CATEGORY_LABELS,
  type TeamIdentitySelection,
  type TeamNameCategory,
} from "@/lib/online/team-identity-options";

import {
  suggestTeamIdentityForLeagues,
  toLeagueSearchCard,
  type LeagueSearchCard,
} from "./online-league-search-model";
import { getOnlineModeStatusCopy } from "./online-mode-status-model";

type SearchState = "idle" | "loading" | "ready" | "error";
type JoinFeedback =
  | {
      leagueId: string;
      tone: "success" | "warning";
      message: string;
    }
  | null;

export function OnlineLeagueSearch() {
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [leagues, setLeagues] = useState<OnlineLeague[]>([]);
  const [joinFeedback, setJoinFeedback] = useState<JoinFeedback>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [joiningLeagueId, setJoiningLeagueId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<TeamNameCategory>("identity_city");
  const [selectedTeamNameId, setSelectedTeamNameId] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joiningLeagueIdRef = useRef<string | null>(null);
  const repository = useMemo(() => getOnlineLeagueRepository(), []);
  const router = useRouter();
  const modeStatus = getOnlineModeStatusCopy(repository.mode);
  const leagueCards = leagues
    .map(toLeagueSearchCard)
    .filter((card): card is LeagueSearchCard => Boolean(card));
  const teamNames = getTeamNamesByCategory(selectedCategory);
  const selectedTeamIdentity: TeamIdentitySelection = {
    cityId: selectedCityId,
    category: selectedCategory,
    teamNameId: selectedTeamNameId,
  };
  const resolvedTeamIdentity = resolveTeamIdentitySelection(selectedTeamIdentity);
  const canJoinWithTeamIdentity = Boolean(resolvedTeamIdentity);
  const categoryDescriptions: Record<TeamNameCategory, string> = {
    classic_sports: "Traditionelle Sportnamen, schnell verständlich und zeitlos.",
    modern_sports: "Kurze, moderne Namen mit Arena- und E-Sports-Gefühl.",
    aggressive_competitive: "Kraftvolle Namen für Teams mit harter, dominanter Identität.",
    identity_city: "Namen, die stärker nach Stadt, Region oder Fan-Kultur klingen.",
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    repository
      .getCurrentUser()
      .then((user) => {
        if (active) {
          setCurrentUserId(user.userId);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUserId(null);
        }
      });

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (searchState !== "ready") {
      return undefined;
    }

    return repository.subscribeToAvailableLeagues(
      setLeagues,
      (error) => {
        const recovery = getOnlineRecoveryCopy(error, {
          title: "Ligen konnten nicht geladen werden.",
          message:
            error.message || "Ligen konnten nicht geladen werden. Bitte versuche es erneut.",
          helper: "Prüfe deine Verbindung.",
        });

        setLeagues([]);
        setSearchError(`${recovery.message} ${recovery.helper}`);
        setSearchState("error");
      },
    );
  }, [repository, searchState]);

  function handleSearch() {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchState("loading");
    setLeagues([]);
    setJoinFeedback(null);
    setSearchError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLeagues(await repository.getAvailableLeagues());
        setSearchState("ready");
      } catch (error) {
        const recovery = getOnlineRecoveryCopy(error, {
          title: "Ligen konnten nicht geladen werden.",
          message: "Ligen konnten nicht geladen werden. Bitte versuche es erneut.",
          helper: "Prüfe deine Verbindung.",
        });

        setLeagues([]);
        setSearchError(`${recovery.message} ${recovery.helper}`);
        setSearchState("error");
      }
    }, 1000);
  }

  async function handleJoinLeague(leagueId: string) {
    if (joiningLeagueIdRef.current) {
      return;
    }

    const selectedLeague = leagueCards.find((leagueCard) => leagueCard.id === leagueId);
    const sourceLeague = leagues.find((league) => league.id === leagueId);
    const isCurrentUserMember = Boolean(
      currentUserId && sourceLeague?.users.some((user) => user.userId === currentUserId),
    );

    if (!selectedLeague) {
      return;
    }

    joiningLeagueIdRef.current = leagueId;
    setJoiningLeagueId(leagueId);

    try {
      const joinTeamIdentity =
        !isCurrentUserMember && resolvedTeamIdentity ? selectedTeamIdentity : undefined;
      const result = await repository.joinLeague(
        selectedLeague.id,
        joinTeamIdentity,
      );

      if (result.league) {
        setLeagues((currentLeagues) =>
          currentLeagues.map((league) =>
            league.id === result.league?.id ? result.league : league,
          ),
        );
      }

      if (
        result.status === "missing-league" ||
        result.status === "full" ||
        result.status === "invalid-team-identity" ||
        result.status === "team-identity-taken"
      ) {
        setJoinFeedback({
          leagueId: selectedLeague.id,
          tone: "warning",
          message: result.message,
        });
        return;
      }

      setJoinFeedback({
        leagueId: selectedLeague.id,
        tone: "success",
        message:
          result.status === "already-member"
            ? "Du bist bereits Mitglied dieser Liga."
            : "Du bist der Liga beigetreten.",
      });
      router.push(`/online/league/${selectedLeague.id}`);
    } catch (error) {
      const recovery = getOnlineRecoveryCopy(error, {
        title: "Beitritt konnte nicht gespeichert werden.",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Beitritt konnte nicht gespeichert werden.",
        helper: "Bitte versuche den Beitritt erneut.",
      });

      setJoinFeedback({
        leagueId: selectedLeague.id,
        tone: "warning",
        message: `${recovery.message} ${recovery.helper}`,
      });
    } finally {
      joiningLeagueIdRef.current = null;
      setJoiningLeagueId(null);
    }
  }

  function handleSuggestTeam() {
    const suggestion = suggestTeamIdentityForLeagues(leagues);

    setJoinFeedback(null);

    if (suggestion.status === "unavailable") {
      setSearchError(suggestion.message);
      return;
    }

    setSearchError(null);
    setSelectedCityId(suggestion.selection.cityId);
    setSelectedCategory(suggestion.selection.category);
    setSelectedTeamNameId(suggestion.selection.teamNameId);
  }

  if (searchState === "idle") {
    return (
      <button
        type="button"
        onClick={handleSearch}
        className="flex min-h-20 w-full items-center justify-center rounded-lg border border-sky-200/30 bg-sky-300/10 px-6 py-5 text-center text-xl font-semibold text-sky-50 transition hover:border-sky-200/55 hover:bg-sky-300/16"
      >
        Liga suchen
      </button>
    );
  }

  if (searchState === "loading") {
    return (
      <div
        aria-live="polite"
        className="flex min-h-20 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-5 text-center text-xl font-semibold text-slate-100"
      >
        Suche nach verfügbaren Ligen…
      </div>
    );
  }

  if (searchState === "error") {
    return (
      <div
        aria-live="polite"
        className="grid gap-3 rounded-lg border border-amber-200/25 bg-amber-300/10 px-5 py-4 text-amber-100"
      >
        <p className="text-sm font-semibold">{searchError}</p>
        <button
          type="button"
          onClick={handleSearch}
          className="w-fit rounded-lg border border-amber-100/25 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/10"
        >
          Erneut suchen
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            Gefundene Ligen
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {modeStatus.searchHelper}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="w-fit rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
        >
          Erneut suchen
        </button>
      </div>

      <section className="mb-5 rounded-lg border border-emerald-200/20 bg-[#07111d]/60 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
              Team-Identität
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Wähle Stadt, Stilrichtung und Teamnamen für deinen Liga-Beitritt.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSuggestTeam}
            disabled={leagues.length === 0 || joiningLeagueId !== null}
            className="w-fit rounded-lg border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Team vorschlagen
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">1. Stadt</span>
            <select
              value={selectedCityId}
              onChange={(event) => {
                setSelectedCityId(event.target.value);
                setJoinFeedback(null);
              }}
              className="min-h-12 rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-200/60"
            >
              <option value="">Stadt auswählen</option>
              {TEAM_IDENTITY_CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} · {city.country}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">2. Kategorie</span>
            <div className="grid gap-2 sm:grid-cols-4">
              {TEAM_NAME_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedTeamNameId("");
                    setJoinFeedback(null);
                  }}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selectedCategory === category
                      ? "border-emerald-200/45 bg-emerald-300/12 text-emerald-50"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/8"
                  }`}
                >
                  <span className="block">{TEAM_NAME_CATEGORY_LABELS[category]}</span>
                  <span className="mt-1 block text-xs font-medium leading-5 opacity-75">
                    {categoryDescriptions[category]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">3. Teamname</span>
            <select
              value={selectedTeamNameId}
              onChange={(event) => {
                setSelectedTeamNameId(event.target.value);
                setJoinFeedback(null);
              }}
              className="min-h-12 rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-200/60"
            >
              <option value="">Teamnamen auswählen</option>
              {teamNames.map((teamName) => (
                <option key={teamName.id} value={teamName.id}>
                  {teamName.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              4. Vorschau
            </p>
            {resolvedTeamIdentity ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Stadt
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {resolvedTeamIdentity.cityName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Name
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {resolvedTeamIdentity.teamName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Vollständiger Teamname
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {resolvedTeamIdentity.teamDisplayName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xl font-semibold text-white">
                Wähle eine Stadt und einen Teamnamen
              </p>
            )}
          </div>
          {searchError ? (
            <p className="rounded-lg border border-amber-200/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
              {searchError}
            </p>
          ) : null}
        </div>
      </section>

      {leagueCards.length > 0 ? (
        <div className="grid gap-4">
          {leagueCards.map((leagueCard) => {
            const cardFeedback =
              joinFeedback?.leagueId === leagueCard.id ? joinFeedback : null;
            const sourceLeague = leagues.find((league) => league.id === leagueCard.id);
            const isCurrentUserMember = Boolean(
              currentUserId && sourceLeague?.users.some((user) => user.userId === currentUserId),
            );
            const canActOnLeague =
              joiningLeagueId === null &&
              (isCurrentUserMember || (leagueCard.canJoin && canJoinWithTeamIdentity));

            return (
              <div
                key={leagueCard.id}
                className="rounded-lg border border-sky-200/25 bg-[#07111d]/70 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      {leagueCard.name}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {leagueCard.playerCountLabel} Spieler
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {leagueCard.statusLabel}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Beitreten ${leagueCard.name}`}
                    disabled={!canActOnLeague}
                    onClick={() => handleJoinLeague(leagueCard.id)}
                    className="min-h-12 rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {joiningLeagueId === leagueCard.id
                      ? "Beitritt läuft..."
                      : isCurrentUserMember
                        ? "Wieder beitreten"
                        : "Beitreten"}
                  </button>
                </div>
                {!isCurrentUserMember && !canJoinWithTeamIdentity ? (
                  <p className="mt-3 text-xs font-semibold text-amber-100/85">
                    Wähle zuerst Stadt und Teamnamen, bevor du beitrittst.
                  </p>
                ) : null}
                {cardFeedback ? (
                  <div
                    aria-live="polite"
                    className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
                      cardFeedback.tone === "success"
                        ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                        : "border-amber-200/25 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    {cardFeedback.message}
                    {cardFeedback.tone === "success" ? (
                      <Link
                        href={`/online/league/${leagueCard.id}`}
                        className="mt-3 inline-flex rounded-lg border border-emerald-200/25 px-3 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-200/10"
                      >
                        Liga öffnen
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/4 p-5 text-center text-slate-200">
          Aktuell ist keine Liga verfügbar.
        </div>
      )}
    </div>
  );
}
