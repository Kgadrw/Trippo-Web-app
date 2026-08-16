import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Cloudy } from "lucide-react";
import { cn } from "@/lib/utils";

type WeatherState = {
  tempC: number;
  code: number;
  label: string;
  place: string;
};

const KIGALI = { lat: -1.9441, lon: 30.0619, place: "Kigali" };
const CACHE_KEY = "trippo-header-weather-v1";
const CACHE_MS = 30 * 60 * 1000;

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Storm";
  return "Weather";
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <Cloudy className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 57) return <CloudDrizzle className={className} />;
  if (code <= 67) return <CloudRain className={className} />;
  if (code <= 77) return <CloudSnow className={className} />;
  if (code <= 82) return <CloudRain className={className} />;
  if (code <= 99) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function readCache(): WeatherState | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherState & { expiresAt?: number };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    if (!Number.isFinite(parsed.tempC)) return null;
    return {
      tempC: parsed.tempC,
      code: parsed.code,
      label: parsed.label,
      place: parsed.place,
    };
  } catch {
    return null;
  }
}

function writeCache(weather: WeatherState) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...weather, expiresAt: Date.now() + CACHE_MS }),
    );
  } catch {
    /* ignore */
  }
}

async function fetchWeather(lat: number, lon: number, place: string): Promise<WeatherState | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const tempC = Number(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code);
  if (!Number.isFinite(tempC)) return null;
  return {
    tempC: Math.round(tempC),
    code: Number.isFinite(code) ? code : 0,
    label: weatherLabel(Number.isFinite(code) ? code : 0),
    place,
  };
}

function resolveCoords(): Promise<{ lat: number; lon: number; place: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(KIGALI);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          place: "Today",
        });
      },
      () => resolve(KIGALI),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

type HeaderWeatherProps = {
  className?: string;
  compact?: boolean;
  /** Live clock — hide on tight headers (e.g. mobile). */
  showTime?: boolean;
};

/**
 * Live clock + today's weather for the header.
 * Weather uses Open-Meteo (no API key) and soft-fails if unavailable.
 */
export function HeaderWeather({
  className,
  compact = false,
  showTime = true,
}: HeaderWeatherProps) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherState | null>(() => readCache());

  useEffect(() => {
    if (!showTime) return;
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [showTime]);

  useEffect(() => {
    if (weather) return;

    let cancelled = false;
    void (async () => {
      try {
        const coords = await resolveCoords();
        const next = await fetchWeather(coords.lat, coords.lon, coords.place);
        if (!next || cancelled) return;
        writeCache(next);
        setWeather(next);
      } catch {
        /* keep empty — weather is optional chrome */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weather]);

  const timeLabel = formatClock(now);

  if (!showTime && !weather) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-gray-600",
        compact ? "px-1" : "rounded-full px-2.5 py-1.5",
        className,
      )}
      title={
        showTime
          ? weather
            ? `${timeLabel} · ${weather.label} · ${weather.place}`
            : timeLabel
          : weather
            ? `${weather.label} · ${weather.place}`
            : undefined
      }
      aria-label={
        showTime
          ? weather
            ? `Current time ${timeLabel}, weather ${weather.tempC} degrees, ${weather.label}`
            : `Current time ${timeLabel}`
          : weather
            ? `Weather ${weather.tempC} degrees, ${weather.label}`
            : undefined
      }
    >
      {showTime ? (
        <span className={cn("tabular-nums font-medium", compact ? "text-xs" : "text-sm")}>
          {timeLabel}
        </span>
      ) : null}
      {weather ? (
        <>
          {showTime ? (
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
          ) : null}
          <WeatherIcon
            code={weather.code}
            className={cn("shrink-0 text-amber-500", compact ? "h-4 w-4" : "h-[18px] w-[18px]")}
          />
          <span className={cn("tabular-nums font-medium", compact ? "text-xs" : "text-sm")}>
            {weather.tempC}°
          </span>
          {!compact ? (
            <span className="hidden max-w-[7.5rem] truncate text-xs text-gray-500 xl:inline">
              {weather.label}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
