import { useState, useEffect } from "react";

const SACRAMENTO_LAT = 38.5816;
const SACRAMENTO_LON = -121.4944;
const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${SACRAMENTO_LAT}&longitude=${SACRAMENTO_LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;

export interface SacramentoWeather {
  temp: number;
  weatherCode: number;
  loading: boolean;
  error: boolean;
}

/**
 * Fetches current weather for Sacramento, CA from Open-Meteo (free, no API key).
 * https://open-meteo.com/
 */
export function useSacramentoWeather(): SacramentoWeather {
  const [temp, setTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        const res = await fetch(OPEN_METEO_URL);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setTemp(data.current?.temperature_2m ?? null);
        setWeatherCode(data.current?.weather_code ?? 0);
        setError(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setTemp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    temp: temp ?? 0,
    weatherCode,
    loading,
    error,
  };
}

/** Map WMO weather code to simple label for accessibility */
export function weatherCodeToLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Clear";
}
