/**
 * Quest Progress Tracking Hook
 * Persists quest completion status in local storage
 */

import { useState, useEffect, useCallback } from 'react';

export interface QuestProgress {
  completedQuests: string[];
  completionDates: Record<string, string>;
  completionCount: Record<string, number>; // Track how many times completed (max 3x rewards)
}

const STORAGE_KEY = 'regen-civics-quest-progress';

const defaultProgress: QuestProgress = {
  completedQuests: [],
  completionDates: {},
  completionCount: {},
};

export function useQuestProgress() {
  const [progress, setProgress] = useState<QuestProgress>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProgress({
          completedQuests: parsed.completedQuests || [],
          completionDates: parsed.completionDates || {},
          completionCount: parsed.completionCount || {},
        });
      }
    } catch (error) {
      console.error('Failed to load quest progress:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save progress to local storage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.error('Failed to save quest progress:', error);
      }
    }
  }, [progress, isLoaded]);

  // Mark a quest as complete
  const completeQuest = useCallback((questId: string) => {
    setProgress((prev) => {
      const currentCount = prev.completionCount[questId] || 0;
      const newCount = Math.min(currentCount + 1, 3); // Max 3 completions for rewards
      
      const newCompletedQuests = prev.completedQuests.includes(questId)
        ? prev.completedQuests
        : [...prev.completedQuests, questId];

      return {
        completedQuests: newCompletedQuests,
        completionDates: {
          ...prev.completionDates,
          [questId]: new Date().toISOString(),
        },
        completionCount: {
          ...prev.completionCount,
          [questId]: newCount,
        },
      };
    });
  }, []);

  // Uncomplete a quest (remove from completed list)
  const uncompleteQuest = useCallback((questId: string) => {
    setProgress((prev) => ({
      completedQuests: prev.completedQuests.filter((id) => id !== questId),
      completionDates: Object.fromEntries(
        Object.entries(prev.completionDates).filter(([id]) => id !== questId)
      ),
      completionCount: Object.fromEntries(
        Object.entries(prev.completionCount).filter(([id]) => id !== questId)
      ),
    }));
  }, []);

  // Toggle quest completion
  const toggleQuest = useCallback((questId: string) => {
    if (progress.completedQuests.includes(questId)) {
      uncompleteQuest(questId);
    } else {
      completeQuest(questId);
    }
  }, [progress.completedQuests, completeQuest, uncompleteQuest]);

  // Check if a quest is completed
  const isQuestCompleted = useCallback(
    (questId: string) => progress.completedQuests.includes(questId),
    [progress.completedQuests]
  );

  // Get completion count for a quest
  const getCompletionCount = useCallback(
    (questId: string) => progress.completionCount[questId] || 0,
    [progress.completionCount]
  );

  // Get completion date for a quest
  const getCompletionDate = useCallback(
    (questId: string) => progress.completionDates[questId] || null,
    [progress.completionDates]
  );

  // Get total completed quests count
  const totalCompleted = progress.completedQuests.length;

  // Reset all progress
  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  return {
    progress,
    isLoaded,
    completeQuest,
    uncompleteQuest,
    toggleQuest,
    isQuestCompleted,
    getCompletionCount,
    getCompletionDate,
    totalCompleted,
    resetProgress,
  };
}
