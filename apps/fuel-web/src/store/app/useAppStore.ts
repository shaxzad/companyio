import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AppState = {
  /** Shared station selection across screens (not server cache). */
  selectedStationId: string | null;
  setSelectedStationId: (stationId: string | null) => void;
};

/**
 * Cross-screen UI / session preferences.
 * Server data belongs in React Query — do not mirror API responses here.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedStationId: null,
      setSelectedStationId: (selectedStationId) => set({ selectedStationId }),
    }),
    { name: 'fuel-web-app' }
  )
);
