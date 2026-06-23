import { useState, useCallback } from 'react';

const STORAGE_KEY = 'dreamlab-workshop-progress';

interface ProgressData {
  completedWorkshops: string[];
}

function readStore(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.completedWorkshops)) return parsed;
    }
  } catch { /* corrupted — reset */ }
  return { completedWorkshops: [] };
}

function writeStore(data: ProgressData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded or unavailable */ }
}

export function useWorkshopProgress() {
  const [data, setData] = useState<ProgressData>(readStore);

  const isCompleted = useCallback(
    (id: string) => data.completedWorkshops.includes(id),
    [data.completedWorkshops]
  );

  const toggleComplete = useCallback((id: string) => {
    setData(prev => {
      const next = prev.completedWorkshops.includes(id)
        ? { completedWorkshops: prev.completedWorkshops.filter(w => w !== id) }
        : { completedWorkshops: [...prev.completedWorkshops, id] };
      writeStore(next);
      return next;
    });
  }, []);

  const phaseProgress = useCallback(
    (workshopIds: string[]) => {
      const done = workshopIds.filter(id => data.completedWorkshops.includes(id)).length;
      const total = workshopIds.length;
      return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    },
    [data.completedWorkshops]
  );

  const reset = useCallback(() => {
    const empty: ProgressData = { completedWorkshops: [] };
    writeStore(empty);
    setData(empty);
  }, []);

  return { isCompleted, toggleComplete, phaseProgress, reset, completedWorkshops: data.completedWorkshops };
}
