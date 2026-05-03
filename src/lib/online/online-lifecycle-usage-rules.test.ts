import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type RawFlowPattern = {
  name: string;
  pattern: RegExp;
};

const RAW_FLOW_DECISION_PATTERNS: RawFlowPattern[] = [
  {
    name: "weekStatus branch",
    pattern: /\b(?:if|while)\s*\([^)]*\.\s*weekStatus\b[^)]*\)/gs,
  },
  {
    name: "readyForWeek branch",
    pattern: /\b(?:if|while)\s*\([^)]*\.\s*readyForWeek\b[^)]*\)/gs,
  },
  {
    name: "fantasyDraft status branch",
    pattern: /\b(?:if|while)\s*\([^)]*\.\s*fantasyDraft\??\.\s*status\b[^)]*\)/gs,
  },
  {
    name: "completedWeeks branch",
    pattern: /\b(?:if|while)\s*\([^)]*\.\s*completedWeeks\b/gs,
  },
  {
    name: "matchResults branch",
    pattern: /\b(?:if|while)\s*\([^)]*\.\s*matchResults\b/gs,
  },
  {
    name: "raw lifecycle field in disabled UI gate",
    pattern:
      /disabled=\{[^}]*(?:weekStatus|readyForWeek|completedWeeks|matchResults|fantasyDraft\??\.\s*status)[^}]*\}/gs,
  },
];

const RAW_WEEK_PROGRESS_BUILDER_PATTERNS: RawFlowPattern[] = [
  {
    name: "inline week progress phase builder",
    pattern: /const\s+phase\s*:\s*OnlineLeagueWeekProgressPhase\s*=/gs,
  },
  {
    name: "draft readiness alias in week progress",
    pattern:
      /const\s+\w*draft\w*\s*=\s*[^;]*(?:fantasyDraft|draftStatus)[^;]*/gis,
  },
];

const FLOW_DECISION_SURFACES = [
  {
    path: "src/components/admin/admin-league-detail.tsx",
  },
  {
    path: "src/components/online/online-league-dashboard-panels.tsx",
  },
  {
    path: "src/components/online/online-league-draft-page.tsx",
  },
  {
    endMarker: "export function getCurrentWeekGames",
    path: "src/lib/online/online-league-week-simulation.ts",
    startMarker: "export function getOnlineLeagueWeekProgressState",
  },
  {
    endMarker: "export function setOnlineMediaExpectation",
    path: "src/lib/online/online-league-service.ts",
    startMarker: "export function simulateOnlineLeagueWeek",
  },
  {
    endMarker: "async updateDepthChart",
    path: "src/lib/online/repositories/firebase-online-league-repository.ts",
    startMarker: "async setUserReady",
  },
  {
    path: "src/lib/admin/online-week-simulation.ts",
    startMarker: "export function prepareOnlineLeagueWeekSimulation",
  },
  {
    path: "src/lib/admin/online-admin-actions.ts",
  },
] satisfies Array<{
  endMarker?: string;
  path: string;
  startMarker?: string;
}>;

function getSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function getScopedSource(path: string, startMarker?: string, endMarker?: string) {
  const source = getSource(path);
  const start = startMarker ? source.indexOf(startMarker) : 0;

  if (start === -1) {
    throw new Error(`${path}: start marker not found: ${startMarker}`);
  }

  const end = endMarker ? source.indexOf(endMarker, start + 1) : source.length;

  if (endMarker && end === -1) {
    throw new Error(`${path}: end marker not found: ${endMarker}`);
  }

  return source.slice(start, end);
}

function lineNumberAt(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function findRawFlowDecisions(source: string) {
  const findings: string[] = [];

  for (const { name, pattern } of RAW_FLOW_DECISION_PATTERNS) {
    pattern.lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
      findings.push(`${name} at line ${lineNumberAt(source, match.index ?? 0)}: ${match[0]}`);
    }
  }

  return findings;
}

function findRawWeekProgressBuilders(source: string) {
  const findings: string[] = [];

  for (const { name, pattern } of RAW_WEEK_PROGRESS_BUILDER_PATTERNS) {
    pattern.lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
      findings.push(`${name} at line ${lineNumberAt(source, match.index ?? 0)}: ${match[0]}`);
    }
  }

  return findings;
}

describe("online lifecycle usage rules", () => {
  it("flags typical raw state reads when they are used as flow decisions", () => {
    const badExamples = [
      'if (league.weekStatus === "simulating") return league;',
      'if (normalizeWeekStatus(league.weekStatus) === "simulating") return league;',
      'if (league.fantasyDraft?.status !== "completed") return null;',
      'if (league.fantasyDraft && league.fantasyDraft.status !== "completed") return null;',
      'while (mappedLeague?.fantasyDraft?.status === "active") {}',
      'if (league.completedWeeks?.length) return "done";',
      'if (league.matchResults?.length) return "results";',
      'if (user.readyForWeek) simulate();',
      '<button disabled={pendingAction !== null || fantasyDraft?.status === "active"} />',
    ];

    for (const example of badExamples) {
      expect(findRawFlowDecisions(example), example).not.toEqual([]);
    }
  });

  it("flags raw week-progress phase builders that bypass lifecycle", () => {
    const oldWeekProgressBuilder = `
      const draftReady = !league.fantasyDraft || league.fantasyDraft.status === "completed";
      const phase: OnlineLeagueWeekProgressPhase =
        normalizedWeekStatus === "simulating"
          ? "simulating"
          : currentWeekCompleted
            ? "completed"
            : latestCompletionAdvancedCursor
              ? "advanced"
              : league.status === "active" && draftReady && readyState.allReady
                ? "ready"
                : "pending";
    `;

    expect(findRawWeekProgressBuilders(oldWeekProgressBuilder)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("draft readiness alias in week progress"),
        expect.stringContaining("inline week progress phase builder"),
      ]),
    );
  });

  it("allows week-progress phase decisions that go through the lifecycle read-model", () => {
    const lifecycleProgressBuilder = `
      const lifecycle = normalizeOnlineLeagueWeekProgressLifecycle({
        currentWeekCompleted,
        latestCompletionAdvancedCursor,
        normalizedWeekStatus,
        readyState,
      });
      return { phase: lifecycle.phase };
    `;

    expect(findRawWeekProgressBuilders(lifecycleProgressBuilder)).toEqual([]);
  });

  it("allows flow decisions that go through the lifecycle read-model", () => {
    const goodExamples = [
      `
        const lifecycle = normalizeOnlineLeagueCoreLifecycle({ league, requiresDraft: true });
        if (!lifecycle.canSimulate) return;
      `,
      `
        const lifecycle = normalizeOnlineCoreLifecycle({ currentUser, league, requiresDraft: true });
        const disabled = pendingAction !== null || lifecycle.draftStatus !== "active";
      `,
      `
        const lifecycle = normalizeOnlineLeagueCoreLifecycle({ league });
        while (lifecycle.draftStatus === "active") break;
      `,
    ];

    for (const example of goodExamples) {
      expect(findRawFlowDecisions(example), example).toEqual([]);
    }
  });

  it("keeps known online flow-decision surfaces on the lifecycle read-model", () => {
    const findings = FLOW_DECISION_SURFACES.flatMap(
      ({ endMarker, path, startMarker }) => {
        const scopedSource = getScopedSource(path, startMarker, endMarker);
        const rawWeekProgressFindings =
          path === "src/lib/online/online-league-week-simulation.ts"
            ? findRawWeekProgressBuilders(scopedSource)
            : [];

        return [
          ...findRawFlowDecisions(scopedSource),
          ...rawWeekProgressFindings,
        ].map((finding) => `${path}: ${finding}`);
      },
    );

    expect(findings).toEqual([]);
  });
});
