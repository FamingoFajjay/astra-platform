// สำรวจดาวเคราะห์นอกระบบ 6,470 ดวงจากผลที่เธอทดสอบ

import { useEffect, useMemo, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { Search, RotateCcw } from "lucide-react";
import { Cell } from "recharts";
import { ZAxis } from "recharts";
import ChartTooltip from "./components/ChartTooltip";

const API = "http://127.0.0.1:8000";

type Planet = {
  planet_name: string;
  hostname: string;
  discovery_method: string | null;
  discovery_year: number | null;
  radius_earth: number | null;
  orbital_period_days: number | null;
  mass_earth: number | null;
  distance_pc: number | null;
};

type Stats = {
  total_planets: number;
  host_stars: number;
  methods: number;
  latest_year: number | null;
  discovery_methods: { name: string; count: number }[];
};

const inputClass =
  "min-w-0 border border-[#383838] bg-[#191919] " +
  "px-2 py-2 font-mono text-[11px] text-[#E5E5E5] " +
  "outline-none focus:border-[#A78BFA]";

function formatNumber(value: number | null, digits = 2) {
  return value == null
    ? "—"
    : value.toLocaleString("en-US", {
        maximumFractionDigits: digits,
      });
}


type PlanetPoint = {
  x: number;
  y: number;
  name: string;
  method: string;
};

type PlanetTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: PlanetPoint;
  }>;
};

function PlanetTooltip({
  active,
  payload,
}: PlanetTooltipProps) {
  if (!active || !payload?.length) return null;

  const planet = payload[0].payload;

    return (
    <ChartTooltip title={planet.name}>
        <p>
        Period: {formatNumber(10 ** planet.x)} days
        </p>
        <p>
        Radius: {formatNumber(planet.y)} R⊕
        </p>
        <p className="text-[#A78BFA]">
        {planet.method}
        </p>
    </ChartTooltip>
    );
}



function getMethodColor(method: string): string {
  switch (method) {
    case "Transit":
      return "#A78BFA";
    case "Radial Velocity":
      return "#60A5FA";
    case "Microlensing":
      return "#F59E0B";
    case "Imaging":
      return "#4ADE80";
    default:
      return "#94A3B8";
  }
}

export default function ExoAtlas() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invalidYears = Boolean(
    yearMin && yearMax && Number(yearMin) > Number(yearMax)
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch(
          `${API}/api/exoatlas/stats`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result: Stats = await response.json();
        if (!controller.signal.aborted) setStats(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("ExoAtlas stats error:", err);
        }
      }
    }

    void loadStats();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (invalidYears) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);

      const params = new URLSearchParams({ limit: "500" });

      if (search) params.set("search", search);
      if (method) params.set("method", method);
      if (yearMin) params.set("year_min", yearMin);
      if (yearMax) params.set("year_max", yearMax);

      try {
        const response = await fetch(
          `${API}/api/exoatlas/planets?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (!Array.isArray(result.data)) {
          throw new Error("Invalid API response");
        }

        if (!controller.signal.aborted) {
          setPlanets(result.data);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setPlanets([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, method, yearMin, yearMax, invalidYears]);

  const scatterData = useMemo(
    () => planets
      .filter(
        (p) =>
          p.radius_earth != null &&
          p.radius_earth > 0 &&
          p.orbital_period_days != null &&
          p.orbital_period_days > 0
      )
    .map((p) => ({
        x: Math.log10(p.orbital_period_days!),
        y: p.radius_earth!,
        name: p.planet_name,
        method: p.discovery_method ?? "Unknown",
    })),
    [planets]
  );

  const metrics = [
    { label: "CONFIRMED PLANETS", value: stats?.total_planets, color: "#A78BFA" },
    { label: "HOST STARS", value: stats?.host_stars, color: "#E5E5E5" },
    { label: "DISCOVERY METHODS", value: stats?.methods, color: "#60A5FA" },
    { label: "LATEST DISCOVERY YEAR", value: stats?.latest_year, color: "#4ADE80" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* METRICS */}
      <div className="grid shrink-0 grid-cols-2 gap-px border border-[#303030] bg-[#303030] xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#171717] p-3">
            <p className="font-mono text-[9px] text-[#888888]">{m.label}</p>
            <p className="mt-2 font-mono text-lg" style={{ color: m.color }}>
              {m.value == null ? "—" : formatNumber(m.value, 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {/* CHARTS */}
        <div className="grid gap-3 2xl:grid-cols-2">
          <section className="min-w-0 border border-[#303030] bg-[#151515]">
            <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
              PLANET RADIUS VS ORBITAL PERIOD
            </div>
            <div className="h-[190px] p-2">
              {scatterData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid stroke="#303030" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      tick={{ fill: "#888888", fontSize: 9 }}
                      tickFormatter={(v: number) => `10^${v}`}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      width={35}
                      tick={{ fill: "#888888", fontSize: 9 }}
                    />
                    <Tooltip
                      content={<PlanetTooltip />}
                      cursor={{ stroke: "#777777", strokeDasharray: "3 3" }}
                      formatter={(value, name) =>
                        name === "x"
                          ? [formatNumber(Math.pow(10, Number(value))), "Period (days)"]
                          : [formatNumber(Number(value)), "Radius (Earth)"]
                      }
                    />
                    <Scatter 
                        data={scatterData}
                        fillOpacity={0.55}
                        stroke="#111111"
                        strokeWidth={0.5}
                    >
                        {scatterData.map((planet, index) => (
                            <Cell
                                key={`${planet.name}-${index}`}
                                fill={getMethodColor(planet.method)}
                            />
                        ))}
                    </Scatter>
                    <ZAxis range={[18, 18]} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#777777]">
                  NO CHART DATA
                </div>
              )}
            </div>
            <p className="px-3 pb-2 font-mono text-[9px] text-[#777777]">
              X: LOG10(PERIOD IN DAYS) / Y: EARTH RADII
            </p>
          </section>

          <section className="min-w-0 border border-[#303030] bg-[#151515]">
            <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
              DISCOVERY METHODS / FULL LOCAL DATABASE
            </div>
            <div className="h-[190px] p-2">
              {stats?.discovery_methods.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.discovery_methods.slice(0, 6)}
                    layout="vertical"
                    margin={{ left: 10, right: 12 }}
                  >
                    <CartesianGrid stroke="#303030" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#888888", fontSize: 9 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: "#AAAAAA", fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1A1A",
                        border: "1px solid #383838",
                        borderRadius: 0,
                        padding: "5px 8px",
                        fontSize: 10,
                      }}
                    />
                    <Bar dataKey="count" fill="#A78BFA" name="Planets" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#777777]">
                  NO CHART DATA
                </div>
              )}
            </div>
          </section>
        </div>

        {/* FILTERS */}
        <section className="border border-[#303030] bg-[#151515]">
          <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
            EXOPLANET EXPLORER / FILTERS
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">SEARCH</span>
              <div className="flex items-center gap-2 border border-[#383838] bg-[#191919] px-2">
                <Search size={13} color="#777777" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Planet or host star"
                  className="w-full min-w-0 bg-transparent py-2 text-xs outline-none"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">DISCOVERY METHOD</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputClass}
              >
                <option value="">ALL METHODS</option>
                {stats?.discovery_methods.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">YEAR FROM</span>
              <input
                type="number"
                min="1980"
                max="2200"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                placeholder="e.g. 2010"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">YEAR TO</span>
              <input
                type="number"
                min="1980"
                max="2200"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                placeholder="e.g. 2026"
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-[#303030] px-3 py-2">
            <span className="font-mono text-[10px] text-[#777777]">
              MAX 500 ROWS PER QUERY
            </span>
            <button
              onClick={() => {
                setSearch("");
                setMethod("");
                setYearMin("");
                setYearMax("");
              }}
              className="flex items-center gap-2 border border-[#383838] px-3 py-1 font-mono text-[10px] hover:bg-[#252525]"
            >
              <RotateCcw size={12} /> RESET
            </button>
          </div>
        </section>

        {invalidYears && (
          <p className="text-xs text-[#F87171]">
            YEAR FROM must not exceed YEAR TO.
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
              EXOPLANET DATABASE
            </span>
            <span className="font-mono text-[10px] text-[#777777]">
              {loading ? "LOADING" : `${planets.length} ROWS`}
            </span>
          </div>

          <div className="max-h-[250px] overflow-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#222222] font-mono text-[10px] text-[#999999]">
                <tr>
                  <th className="p-3 font-normal">PLANET</th>
                  <th className="p-3 font-normal">HOST</th>
                  <th className="p-3 font-normal">METHOD</th>
                  <th className="p-3 font-normal">YEAR</th>
                  <th className="p-3 text-right font-normal">RADIUS (R⊕)</th>
                  <th className="p-3 text-right font-normal">PERIOD (D)</th>
                </tr>
              </thead>
              <tbody>
                {planets.map((p) => (
                  <tr key={p.planet_name} className="border-t border-[#292929] hover:bg-[#202020]">
                    <td className="p-3 font-medium text-[#A78BFA]">{p.planet_name}</td>
                    <td className="p-3">{p.hostname}</td>
                    <td className="p-3 text-[#AAAAAA]">{p.discovery_method ?? "—"}</td>
                    <td className="p-3 font-mono">{p.discovery_year ?? "—"}</td>
                    <td className="p-3 text-right font-mono">{formatNumber(p.radius_earth)}</td>
                    <td className="p-3 text-right font-mono">{formatNumber(p.orbital_period_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#303030] px-3 py-2 font-mono text-[10px] text-[#777777]">
            DISPLAYED: {planets.length} / MAX 500
          </div>
        </section>

        <p className="pb-2 text-[10px] leading-5 text-[#888888]">
          SOURCE: NASA Exoplanet Archive / pscomppars.
          Summary metrics and discovery methods use the full local database.
          Scatter plot uses at most 500 returned records, not the full population.
          Composite parameters may originate from different references.
        </p>
      </div>
    </div>
  );
}
