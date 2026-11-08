
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Download, Search, RotateCcw } from "lucide-react";

const API = "http://127.0.0.1:8000";

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

type SortField =
  | "approach_datetime"
  | "miss_distance_km"
  | "velocity_kmh"
  | "diameter_max_m"
  | "name";

const inputStyle =
  "min-w-0 border border-[#383838] bg-[#191919] px-2 py-2 " +
  "font-mono text-[11px] text-[#E5E5E5] outline-none " +
  "focus:border-[#60A5FA]";

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function exportCSV(records: Asteroid[]) {
  const columns: (keyof Asteroid)[] = [
    "asteroid_id",
    "name",
    "approach_date",
    "approach_datetime",
    "miss_distance_km",
    "velocity_kmh",
    "diameter_min_m",
    "diameter_max_m",
    "hazardous",
  ];

  const escapeCSV = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...records.map((record) =>
      columns.map((key) => escapeCSV(record[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "astra_cosmicwatch_filtered.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CosmicWatch() {
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>(
    "approach_datetime"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const invalidDates = Boolean(
    startDate && endDate && startDate > endDate
  );

  useEffect(() => {
    if (invalidDates) return;

    const controller = new AbortController();

    const params = new URLSearchParams({
      limit: "500",
      hazardous_only: String(hazardousOnly),
      search,
      sort_by: sortBy,
      sort_order: sortOrder,
    });

    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    // Debounce search to avoid requesting on every keystroke.
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API}/api/cosmicwatch/asteroids?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!Array.isArray(result.data)) {
          throw new Error("Invalid API response");
        }

        setAsteroids(result.data);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Unknown error"
        );
        setAsteroids([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    search,
    startDate,
    endDate,
    hazardousOnly,
    sortBy,
    sortOrder,
    reloadKey,
    invalidDates,
  ]);

  const stats = useMemo(() => {
    const unique = new Set(
      asteroids.map((a) => a.asteroid_id)
    ).size;

    const hazardous = asteroids.filter(
      (a) => Boolean(a.hazardous)
    ).length;

    const closest = asteroids.length
      ? Math.min(...asteroids.map((a) => a.miss_distance_km))
      : null;

    return {
      approaches: asteroids.length,
      unique,
      hazardous,
      closest,
    };
  }, [asteroids]);

  const dailyData = useMemo(() => {
    const counts = new Map<string, number>();

    for (const asteroid of asteroids) {
      counts.set(
        asteroid.approach_date,
        (counts.get(asteroid.approach_date) ?? 0) + 1
      );
    }

    return Array.from(counts, ([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [asteroids]);

  const scatterData = useMemo(() => {
    return {
      regular: asteroids
        .filter((a) => !a.hazardous)
        .map((a) => ({
          x: a.miss_distance_km / 1_000_000,
          y: a.velocity_kmh / 1000,
          name: a.name,
        })),
      hazardous: asteroids
        .filter((a) => Boolean(a.hazardous))
        .map((a) => ({
          x: a.miss_distance_km / 1_000_000,
          y: a.velocity_kmh / 1000,
          name: a.name,
        })),
    };
  }, [asteroids]);

  const metrics = [
    {
      label: "CLOSE APPROACHES",
      value: formatNumber(stats.approaches),
      color: "#60A5FA",
    },
    {
      label: "UNIQUE OBJECTS",
      value: formatNumber(stats.unique),
      color: "#E5E5E5",
    },
    {
      label: "PHA APPROACHES",
      value: formatNumber(stats.hazardous),
      color: "#F59E0B",
    },
    {
      label: "CLOSEST DISTANCE",
      value: stats.closest === null
        ? "—"
        : `${formatNumber(stats.closest / 1_000_000, 2)}M km`,
      color: "#4ADE80",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* METRICS */}
      <div className="grid shrink-0 grid-cols-2 gap-px border border-[#303030] bg-[#303030] xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-[#171717] p-3">
            <p className="font-mono text-[9px] text-[#888888]">
              {metric.label}
            </p>
            <p
              className="mt-2 font-mono text-lg"
              style={{ color: metric.color }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {/* CHARTS */}
          <div className="grid gap-3 2xl:grid-cols-2">
            <section className="min-w-0 border border-[#303030] bg-[#151515]">
              <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
                APPROACH DISTRIBUTION / DAILY
              </div>
              <div className="h-[190px] p-2">
                {dailyData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid
                        stroke="#303030"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#888888", fontSize: 9 }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#888888", fontSize: 10 }}
                        width={28}
                      />
                        <Tooltip
                            cursor={{ fill: "#FFFFFF", fillOpacity: 0.04 }}
                            contentStyle={{
                                backgroundColor: "#1A1A1A",
                                border: "1px solid #383838",
                                borderRadius: 0,
                                padding: "5px 8px",
                                fontSize: "10px",
                                fontFamily: "monospace",
                                boxShadow: "none",
                            }}
                            labelStyle={{
                                color: "#A3A3A3",
                                fontSize: "10px",
                                marginBottom: "2px",
                            }}
                            itemStyle={{
                                color: "#60A5FA",
                                fontSize: "10px",
                                padding: 0,
                            }}
                        />
                      <Bar
                        dataKey="count"
                        fill="#60A5FA"
                        name="Approaches"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#777777]">
                    NO CHART DATA
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 border border-[#303030] bg-[#151515]">
              <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
                DISTANCE VS RELATIVE VELOCITY
              </div>
              <div className="h-[190px] p-2">
                {asteroids.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid stroke="#303030" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Distance"
                        unit="M km"
                        tick={{ fill: "#888888", fontSize: 9 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Velocity"
                        unit="k"
                        tick={{ fill: "#888888", fontSize: 9 }}
                        width={36}
                      />
                      <ZAxis type="number" range={[35, 35]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "#202020",
                          border: "1px solid #404040",
                          color: "#E5E5E5",
                        }}
                      />
                      <Scatter
                        name="Other NEOs"
                        data={scatterData.regular}
                        fill="#A78BFA"
                      />
                      <Scatter
                        name="PHA"
                        data={scatterData.hazardous}
                        fill="#F59E0B"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#777777]">
                    NO CHART DATA
                  </div>
                )}
              </div>
              <div className="px-3 pb-2 font-mono text-[9px] text-[#777777]">
                X: MILLION KM / Y: THOUSAND KM/H
              </div>
            </section>
          </div>

          {/* FILTERS */}
          <section className="border border-[#303030] bg-[#151515]">
            <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
              DATA EXPLORER / FILTERS
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[9px] text-[#888888]">
                  SEARCH OBJECT
                </span>
                <div className="flex items-center gap-2 border border-[#383838] bg-[#191919] px-2">
                  <Search size={13} color="#777777" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setLoading(true);
                    }}
                    placeholder="Name or NASA ID"
                    className="w-full min-w-0 bg-transparent py-2 text-xs outline-none"
                  />
                </div>
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[9px] text-[#888888]">
                  START DATE
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setLoading(true);
                  }}
                  className={inputStyle}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[9px] text-[#888888]">
                  END DATE
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setLoading(true);
                  }}
                  className={inputStyle}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[9px] text-[#888888]">
                  SORT BY
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortField);
                    setLoading(true);
                  }}
                  className={inputStyle}
                >
                  <option value="approach_datetime">Approach date</option>
                  <option value="miss_distance_km">Miss distance</option>
                  <option value="velocity_kmh">Relative velocity</option>
                  <option value="diameter_max_m">Max diameter</option>
                  <option value="name">Object name</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#303030] px-3 py-2">
              <label className="flex items-center gap-2 font-mono text-[10px]">
                <input
                  type="checkbox"
                  checked={hazardousOnly}
                  onChange={(e) => {
                    setHazardousOnly(e.target.checked);
                    setLoading(true);
                  }}
                  className="accent-[#F59E0B]"
                />
                PHA ONLY
              </label>

              <button
                onClick={() => {
                  setSortOrder((v) => v === "asc" ? "desc" : "asc");
                  setLoading(true);
                }}
                className="border border-[#383838] px-2 py-1 font-mono text-[10px] hover:bg-[#252525]"
              >
                ORDER: {sortOrder.toUpperCase()}
              </button>

              <button
                onClick={() => {
                  setSearch("");
                  setStartDate("");
                  setEndDate("");
                  setHazardousOnly(false);
                  setSortBy("approach_datetime");
                  setSortOrder("desc");
                  setLoading(true);
                  setReloadKey((v) => v + 1);
                }}
                className="flex items-center gap-1 text-[10px] text-[#999999] hover:text-white"
              >
                <RotateCcw size={12} />
                RESET
              </button>

              <button
                onClick={() => exportCSV(asteroids)}
                disabled={loading || !!error || invalidDates || !asteroids.length}
                className="ml-auto flex items-center gap-2 border border-[#383838] bg-[#202020] px-3 py-2 font-mono text-[10px] hover:bg-[#303030] disabled:opacity-40"
              >
                <Download size={13} color="#60A5FA" />
                EXPORT CSV
              </button>
            </div>
          </section>

          {invalidDates && (
            <p className="text-xs text-[#F87171]">
              START DATE must not exceed END DATE.
            </p>
          )}

          {error && (
            <p className="border border-[#503333] p-3 text-xs text-[#F87171]">
              API ERROR: {error}
            </p>
          )}

          {/* TABLE */}
          <section className="min-w-0 border border-[#303030] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2">
              <span className="font-mono text-[10px] text-[#BBBBBB]">
                NEAR-EARTH OBJECT RECORDS
              </span>
              <span className="font-mono text-[10px] text-[#777777]">
                {loading ? "LOADING" : `${asteroids.length} ROWS`}
              </span>
            </div>

            <div className="max-h-[260px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#222222] font-mono text-[10px] text-[#999999]">
                  <tr>
                    <th className="p-3 font-normal">OBJECT</th>
                    <th className="p-3 font-normal">DATE</th>
                    <th className="p-3 text-right font-normal">DISTANCE KM</th>
                    <th className="p-3 text-right font-normal">SPEED KM/H</th>
                    <th className="p-3 text-right font-normal">MAX DIA. M</th>
                    <th className="p-3 text-center font-normal">PHA</th>
                  </tr>
                </thead>
                <tbody>
                  {asteroids.map((a) => (
                    <tr
                      key={`${a.asteroid_id}-${a.approach_datetime}`}
                      className="border-t border-[#292929] hover:bg-[#202020]"
                    >
                      <td className="p-3">{a.name}</td>
                      <td className="p-3 font-mono">{a.approach_date}</td>
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
                        <span className={a.hazardous
                          ? "text-[#F59E0B]"
                          : "text-[#777777]"}>
                          {a.hazardous ? "YES" : "NO"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#303030] px-3 py-2 font-mono text-[10px] text-[#777777]">
              {loading
                ? "LOADING FILTERED DATA..."
                : `DISPLAYED: ${asteroids.length} RECORDS / QUERY LIMIT: 500`}
            </div>
          </section>

          <p className="pb-2 text-[10px] leading-5 text-[#888888]">
            SOURCE: NASA NeoWs / Locally stored close-approach records.
            PHA is a classification, not a collision prediction.
            Charts and metrics describe returned records only.
            Maximum 500 records per query.
          </p>
        </div>
      </div>
    </div>
  );
}
