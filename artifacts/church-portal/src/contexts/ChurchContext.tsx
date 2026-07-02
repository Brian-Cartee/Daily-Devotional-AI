import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, type ChurchSummary, type DashboardStats } from "../lib/api";

interface ChurchContextValue {
  church: ChurchSummary | null;
  stats: DashboardStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ChurchContext = createContext<ChurchContextValue>({
  church: null,
  stats: null,
  loading: true,
  refresh: async () => {},
});

export function ChurchProvider({ children }: { children: ReactNode }) {
  const [church, setChurch] = useState<ChurchSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.dashboard.get();
      setChurch(data.church);
      setStats({
        activePrayerCount: data.activePrayerCount,
        memberCount: data.memberCount,
        publishedAnnouncementCount: data.publishedAnnouncementCount,
        visitorsThisMonth: data.visitorsThisMonth,
      });
    } catch {
      setChurch(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ChurchContext.Provider value={{ church, stats, loading, refresh }}>
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch() {
  return useContext(ChurchContext);
}
