import { useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { useStations } from './useStations';

/**
 * Shared station selection backed by React Query (stations list) + app store (selection).
 * Prevents every screen from independently picking / re-fetching stations.
 */
export function useSelectedStation() {
  const stationsQuery = useStations();
  const selectedStationId = useAppStore((state) => state.selectedStationId);
  const setSelectedStationId = useAppStore((state) => state.setSelectedStationId);

  const stations = stationsQuery.data ?? [];

  useEffect(() => {
    if (!stations.length) return;
    const stillValid = selectedStationId
      ? stations.some((station) => station.id === selectedStationId)
      : false;
    if (!stillValid) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId, setSelectedStationId]);

  const station = useMemo(
    () => stations.find((item) => item.id === selectedStationId) ?? stations[0] ?? null,
    [stations, selectedStationId]
  );

  return {
    ...stationsQuery,
    stations,
    station,
    stationId: station?.id ?? '',
    setStationId: setSelectedStationId,
  };
}
