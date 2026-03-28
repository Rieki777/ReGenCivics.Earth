/**
 * useProgressMap - aggregates player progress from multiple sources.
 * Reads quest completions, investor journey, and localStorage-cached page visits.
 * Returns computed node states for all 4 paths.
 */
import { useMemo, useCallback } from "react";
import { PATHS, SHARED_NODES, type PathId, type NodeState, type MapNode } from "./mapData";

const STORAGE_KEY = "regen-progress-map";

interface StoredProgress {
  completedNodes: string[];
  visitedPages: string[];
}

function getStored(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedNodes: [], visitedPages: [] };
    return JSON.parse(raw);
  } catch {
    return { completedNodes: [], visitedPages: [] };
  }
}

function saveStored(data: StoredProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Read quest progress from the existing quest tracker */
function getQuestCompletionCount(): number {
  try {
    const raw = localStorage.getItem("regen-civics-quest-progress");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return parsed.completedQuests?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Read investor journey progress */
function getInvestorSteps(): Set<string> {
  try {
    const raw = localStorage.getItem("regen-investor-journey");
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/** Check if user has a forum post (from profile data) */
function hasForumActivity(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.completedNodes?.includes("play-4") ?? false;
  } catch {
    return false;
  }
}

export interface PathProgress {
  pathId: PathId;
  completed: number;
  total: number;
  percent: number;
  nodeStates: Map<string, NodeState>;
  nextNode: MapNode | null;
}

export interface ProgressMapState {
  paths: PathProgress[];
  totalCompleted: number;
  totalNodes: number;
  overallPercent: number;
  completedSet: Set<string>;
  markCompleted: (nodeId: string) => void;
  trackPageVisit: (page: string) => void;
}

export function useProgressMap(): ProgressMapState {
  const stored = useMemo(() => getStored(), []);
  const questCount = useMemo(() => getQuestCompletionCount(), []);
  const investorSteps = useMemo(() => getInvestorSteps(), []);

  // Build the complete set of completed node IDs
  const completedSet = useMemo(() => {
    const set = new Set(stored.completedNodes);

    // Auto-detect page visits
    for (const page of stored.visitedPages) {
      if (page === "/land") set.add("land-1");
      if (page === "/ally") set.add("ally-1");
      if (page === "/play") set.add("play-1");
      if (page === "/opportunity") set.add("fund-1");
      if (page === "/map") set.add("fund-3");
    }

    // Quest progress -> Play path nodes
    if (questCount >= 1) set.add("play-2");
    if (questCount >= 5) set.add("play-3");
    if (questCount >= 10) set.add("play-5");
    if (questCount >= 14) set.add("play-6");

    // Forum activity
    if (hasForumActivity()) set.add("play-4");

    // Investor journey -> Fund path
    if (investorSteps.has("learn")) set.add("fund-1");
    if (investorSteps.has("connect")) set.add("fund-2");
    if (investorSteps.has("explore")) set.add("fund-3");
    if (investorSteps.has("invest")) set.add("fund-4");

    // Shared nodes: if any instance is complete, all are
    for (const group of Object.values(SHARED_NODES)) {
      const anyDone = group.some(id => set.has(id));
      if (anyDone) group.forEach(id => set.add(id));
    }

    return set;
  }, [stored, questCount, investorSteps]);

  // Compute per-path progress
  const paths = useMemo<PathProgress[]>(() => {
    return PATHS.map(path => {
      const nodeStates = new Map<string, NodeState>();
      let firstIncomplete: MapNode | null = null;

      for (let i = 0; i < path.nodes.length; i++) {
        const node = path.nodes[i];
        if (completedSet.has(node.id)) {
          nodeStates.set(node.id, "completed");
        } else if (i === 0 || completedSet.has(path.nodes[i - 1].id)) {
          nodeStates.set(node.id, "unlocked");
          if (!firstIncomplete) firstIncomplete = node;
        } else {
          nodeStates.set(node.id, "locked");
        }
      }

      const completed = path.nodes.filter(n => completedSet.has(n.id)).length;
      return {
        pathId: path.id,
        completed,
        total: path.nodes.length,
        percent: Math.round((completed / path.nodes.length) * 100),
        nodeStates,
        nextNode: firstIncomplete,
      };
    });
  }, [completedSet]);

  const totalCompleted = paths.reduce((sum, p) => sum + p.completed, 0);
  const totalNodes = paths.reduce((sum, p) => sum + p.total, 0);

  const markCompleted = useCallback((nodeId: string) => {
    const current = getStored();
    if (!current.completedNodes.includes(nodeId)) {
      current.completedNodes.push(nodeId);
      saveStored(current);
    }
  }, []);

  const trackPageVisit = useCallback((page: string) => {
    const current = getStored();
    if (!current.visitedPages.includes(page)) {
      current.visitedPages.push(page);
      saveStored(current);
    }
  }, []);

  return {
    paths,
    totalCompleted,
    totalNodes,
    overallPercent: totalNodes > 0 ? Math.round((totalCompleted / totalNodes) * 100) : 0,
    completedSet,
    markCompleted,
    trackPageVisit,
  };
}
