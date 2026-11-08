
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Asteroid = {
  asteroid_id: string;
  name: string;
  approach_date: string;
  approach_datetime: string;
  miss_distance_km: number;
  velocity_kmh: number;
  diameter_min_m: number;
  diameter_max_m: number;
  hazardous: number;
};

type Stats = {
  total_approaches: number;
  unique_asteroids: number;
  hazardous_approaches: number;
  closest_distance_km: number | null;
};

const API = "http://127.0.0.1:8000";

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

export default function CosmicWatch() {
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({
          limit: "100",
          hazardous_only: String(hazardousOnly),
        });

        const [asteroidResponse, statsResponse] =
          await Promise.all([
            fetch(`${API}/api/cosmicwatch/asteroids?${query}`),
            fetch(`${API}/api/cosmicwatch/stats`),
          ]);

        if (!asteroidResponse.ok || !statsResponse.ok) {
          throw new Error("Backend returned an error");
        }

        const asteroidJson = await asteroidResponse.json();
        const statsJson = await statsResponse.json();

        if (!cancelled) {
          setAsteroids(asteroidJson.data);
          setStats(statsJson);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setAsteroids([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [hazardousOnly]);

  const metrics = [
    {
      label: "CLOSE APPROACHES",
      value: stats ? formatNumber(stats.total_approaches) : "—",
      color: "#60A5FA",
    },
    {
      label: "UNIQUE OBJECTS",
      value: stats ? formatNumber(stats.unique_asteroids) : "—",
      color: "#E5E5E5",
    },
    {
      label: "PHA APPROACHES",
      value: stats ? formatNumber(stats.hazardous_approaches) : "—",
      color: "#F59E0B",
    },
    {
      label: "CLOSEST DISTANCE",
      value: stats?.closest_distance_km != null
        ? `${formatNumber(stats.closest_distance_km / 1_000_000, 2)}M km`
        : "—",
      color: "#4ADE80",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-px border border-[#303030] bg-[#303030] xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-[#171717] p-3">
            <p className="font-mono text-[10px] text-[#888888]">
              {metric.label}
            </p>
            <p
              className="mt-3 font-mono text-xl"
              style={{ color: metric.color }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#303030]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303030] bg-[#191919] p-3">
          <div>
            <h3 className="font-mono text-xs tracking-wider">
              NEAR-EARTH OBJECT RECORDS
            </h3>
            <p className="mt-1 text-[10px] text-[#888888]">
              NASA NeoWs / Stored close-approach observations
            </p>
          </div>

          <label className="flex items-center gap-2 font-mono text-[11px] text-[#BBBBBB]">
            <input
              type="checkbox"
              checked={hazardousOnly}
              onChange={(e) => setHazardousOnly(e.target.checked)}
              className="accent-[#60A5FA]"
            />
            PHA ONLY
          </label>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-xs text-[#999999]">
            <RefreshCw size={14} className="animate-spin" />
            LOADING DATA
          </div>
        ) : error ? (
          <div className="p-8 text-xs text-[#F87171]">
            API ERROR: {error}
          </div>
        ) : asteroids.length === 0 ? (
          <div className="p-8 text-xs text-[#999999]">
            NO RECORDS FOUND. Run the ingestion script first.
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#1C1C1C] font-mono text-[10px] text-[#999999]">
                <tr>
                  <th className="p-3 font-normal">OBJECT</th>
                  <th className="p-3 font-normal">DATE</th>
                  <th className="p-3 text-right font-normal">DISTANCE (KM)</th>
                  <th className="p-3 text-right font-normal">SPEED (KM/H)</th>
                  <th className="p-3 text-right font-normal">MAX DIA. (M)</th>
                  <th className="p-3 text-center font-normal">PHA</th>
                </tr>
              </thead>
              <tbody>
                {asteroids.map((a) => (
                  <tr
                    key={`${a.asteroid_id}-${a.approach_datetime}`}
                    className="border-t border-[#292929] hover:bg-[#202020]"
                  >
                    <td className="p-3 font-medium text-[#E5E5E5]">
                      {a.name}
                    </td>
                    <td className="p-3 font-mono text-[#BBBBBB]">
                      {a.approach_date}
                    </td>
                    <td className="p-3 text-right font-mono text-[#60A5FA]">
                      {formatNumber(a.miss_distance_km)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatNumber(a.velocity_kmh)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatNumber(a.diameter_max_m, 1)}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={a.hazardous ? "text-[#F59E0B]" : "text-[#777777]"}>
                        {a.hazardous ? "YES" : "NO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[#303030] bg-[#151515] px-3 py-2 font-mono text-[10px] text-[#777777]">
          DISPLAYED: {asteroids.length} RECORDS / MAX 100
        </div>
      </div>
      <p className="text-[10px] leading-5 text-[#888888]">
        PHA is a NASA classification, not a collision prediction.
        Metrics summarize locally stored records, not all known asteroids.
      </p>
    </div>
  );
}
