
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  Radio,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import ChartTooltip from "./components/ChartTooltip";

const API = "http://127.0.0.1:8000";

type Circular = {
  circular_id: number;
  subject: string;
  event_id: string | null;
  event_type: string;
  published_at: string;
  submitter: string | null;
  source_url: string;
  alert_match: number;
  priority: string;
  rule_label: string | null;
};

type Stats = {
  total_circulars: number;
  alert_matches: number;
  grb_reports: number;
  categories: number;
  latest_published_at: string | null;
  event_types: { name: string; count: number }[];
};

const COLORS: Record<string, string> = {
  GRB: "#FB7185",
  NEUTRINO: "#60A5FA",
  SUPERNOVA: "#F59E0B",
  X_RAY: "#A78BFA",
  OTHER: "#94A3B8",
};

function eventColor(type: string) {
  return COLORS[type] ?? "#94A3B8";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      });
}

type TypeTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: { name: string; count: number };
  }>;
};

function TypeTooltip({ active, payload }: TypeTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <ChartTooltip title={item.name}>
      <p style={{ color: eventColor(item.name) }}>
        Circulars: {item.count}
      </p>
    </ChartTooltip>
  );
}

export default function AstroAlert() {
  const [records, setRecords] = useState<Circular[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: "500",
        search,
        alerts_only: String(alertsOnly),
      });

      if (eventType) params.set("event_type", eventType);

      try {
        const [feedResponse, statsResponse] = await Promise.all([
          fetch(`${API}/api/astroalert/circulars?${params}`, {
            signal: controller.signal,
          }),
          fetch(`${API}/api/astroalert/stats`, {
            signal: controller.signal,
          }),
        ]);

        if (!feedResponse.ok || !statsResponse.ok) {
          throw new Error(
            `API error: feed ${feedResponse.status}, stats ${statsResponse.status}`
          );
        }

        const feed = await feedResponse.json();
        const summary: Stats = await statsResponse.json();

        if (!Array.isArray(feed.data)) {
          throw new Error("Invalid circular feed");
        }

        if (!controller.signal.aborted) {
          setRecords(feed.data);
          setStats(summary);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Unknown error"
          );
          setRecords([]);
          setStats(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, eventType, alertsOnly, refreshKey]);

  const chartData = useMemo(
    () => stats?.event_types ?? [],
    [stats]
  );

  const metrics = [
    {
      label: "CIRCULARS",
      value: stats?.total_circulars,
      color: "#E5E5E5",
    },
    {
      label: "GRB REPORTS",
      value: stats?.grb_reports,
      color: "#FB7185",
    },
    {
      label: "RULE MATCHES",
      value: stats?.alert_matches,
      color: "#F59E0B",
    },
    {
      label: "CATEGORIES",
      value: stats?.categories,
      color: "#60A5FA",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 text-[#E8E8E8]">
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
              {loading || metric.value == null
                ? "—"
                : metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {/* CHART */}
        <section className="border border-[#303030] bg-[#151515]">
          <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2">
            <span className="font-mono text-[10px] text-[#BBBBBB]">
              ASTRONOMICAL REPORT DISTRIBUTION
            </span>
            <Radio size={14} color="#FB7185" />
          </div>

          <div className="h-[190px] p-2">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <CartesianGrid
                    stroke="#303030"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "#888888", fontSize: 9 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: "#AAAAAA", fontSize: 9 }}
                  />
                  <Tooltip
                    content={<TypeTooltip />}
                    cursor={{
                      fill: "#FFFFFF",
                      fillOpacity: 0.035,
                    }}
                  />
                  <Bar dataKey="count" name="Circulars">
                    {chartData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={eventColor(item.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#777777]">
                NO CIRCULAR DATA
              </div>
            )}
          </div>
        </section>

        {/* FILTERS */}
        <section className="border border-[#303030] bg-[#151515]">
          <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
            EVENT EXPLORER / FILTERS
          </div>

          <div className="flex flex-wrap items-end gap-2 p-3">
            <label className="flex min-w-[160px] flex-1 flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">
                SEARCH REPORT
              </span>
              <div className="astra-control flex w-full min-w-0 items-center gap-2 px-2">
                <Search size={13} color="#888888" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Subject or event ID"
                  className="h-full w-full min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">
                EVENT TYPE
              </span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="astra-control min-w-[120px] font-mono"
              >
                <option value="">ALL TYPES</option>
                {Object.keys(COLORS).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex h-[36px] items-center gap-2 font-mono text-[10px]">
              <input
                type="checkbox"
                checked={alertsOnly}
                onChange={(e) => setAlertsOnly(e.target.checked)}
                className="astra-checkbox astra-checkbox-rose"
              />
              RULE MATCHES ONLY
            </label>

            <button
              onClick={() => setRefreshKey((v) => v + 1)}
              className="astra-control font-mono text-[10px]"
            >
              <RefreshCw size={12} />
              REFRESH
            </button>
          </div>
        </section>

        {error && (
          <p className="border border-[#603535] p-3 text-xs text-[#F87171]">
            API ERROR: {error}
          </p>
        )}

        {/* EVENT FEED */}
        <section className="border border-[#303030] bg-[#111111]">
          <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2">
            <span className="font-mono text-[10px] text-[#BBBBBB]">
              ASTRONOMICAL CIRCULAR FEED
            </span>
            <span className="font-mono text-[10px] text-[#777777]">
              {loading ? "LOADING" : `${records.length} ROWS`}
            </span>
          </div>

          <div className="max-h-[270px] overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.circular_id}
                className="border-b border-[#292929] p-3 last:border-0 hover:bg-[#1B1B1B]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono text-[10px]"
                    style={{
                      color: eventColor(record.event_type),
                    }}
                  >
                    [{record.event_type}]
                  </span>

                  {Boolean(record.alert_match) && (
                    <span className="border border-[#6B4B24] px-1.5 py-0.5 font-mono text-[9px] text-[#F59E0B]">
                      RULE MATCH · {record.priority}
                    </span>
                  )}

                  <span className="font-mono text-[10px] text-[#777777]">
                    {formatDate(record.published_at)} UTC
                  </span>
                </div>

                <p className="mt-2 text-xs font-medium text-[#E5E5E5]">
                  {record.subject}
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-[#888888]">
                    {record.event_id ?? "NO EVENT ID"}
                    {" / "}
                    {record.submitter ?? "UNKNOWN SUBMITTER"}
                  </span>

                  <a
                    href={record.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[10px] text-[#60A5FA] hover:underline"
                  >
                    GCN SOURCE
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))}

            {!loading && !error && records.length === 0 && (
              <p className="p-5 text-xs text-[#888888]">
                NO MATCHING CIRCULARS
              </p>
            )}
          </div>

          <div className="border-t border-[#303030] px-3 py-2 font-mono text-[10px] text-[#777777]">
            DISPLAYED: {records.length} / MAX 500
          </div>
        </section>

        <p className="pb-2 text-[10px] leading-5 text-[#888888]">
          SOURCE: NASA GCN Circulars. Reports are classified
          using subject-based rules. Alert priority represents
          local monitoring preferences, not physical danger.
          Metrics describe the stored circular archive.
          Refresh reads SQLite; it does not fetch NASA data.
        </p>
      </div>
    </div>
  );
}
