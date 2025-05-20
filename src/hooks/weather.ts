import { useState, useCallback, useEffect } from "react";
import { fetchCityName as fetchCityNameUtil } from "@/lib/utils/loadWeather";

type UseDisplayModeProps<M extends string> = {
  initialMode: M;
};

type UseDisplayModeReturn<M extends string> = {
  displayMode: M;
  dropdownOpen: boolean;
  toggleDropdown: () => void;
  selectDisplayMode: (mode: M) => void;
};

type UseWeatherDataProps<T> = {
  fetchFunction: (latitude: number, longitude: number) => Promise<T | null>;
  lat: number | undefined;
  lon: number | undefined;
};

type UseLocationNameProps = {
  lat: number | undefined;
  lon: number | undefined;
};

export function useDisplayMode<M extends string>({
  initialMode,
}: UseDisplayModeProps<M>): UseDisplayModeReturn<M> {
  const [displayMode, setDisplayMode] = useState<M>(initialMode);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const toggleDropdown = useCallback(
    () => setDropdownOpen((prev) => !prev),
    []
  );
  const selectDisplayMode = useCallback((mode: M) => {
    setDisplayMode(mode);
    setDropdownOpen(false);
  }, []);

  return { displayMode, dropdownOpen, toggleDropdown, selectDisplayMode };
}

export function useWeatherData<T>({
  fetchFunction,
  lat,
  lon,
}: UseWeatherDataProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!(lat && lon));
  const [error, setError] = useState<string | null>(null);

  const executeFetch = useCallback(async () => {
    if (!lat || !lon) {
      setError("Latitude and Longitude are required");
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(lat, lon);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, fetchFunction]);

  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  return { data, isLoading, error, refetch: executeFetch };
}

export function useLocationName({ lat, lon }: UseLocationNameProps) {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchName = useCallback(async () => {
    if (!lat || !lon) {
      setLocationName(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const city = await fetchCityNameUtil(lat, lon);
      setLocationName(city);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch location name"
      );
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchName();
  }, [fetchName]);

  return { locationName, isLoading, error };
}
