// สำรวจ Solar Flares และ Geomagnetic Storms
import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, RefreshCw, Search, Sun } from "lucide-react";
import ChartTooltip from "./components/ChartTooltip";

type SolarEvent = {
  event_id: string;
  event_type: "FLR" | "GST";
  start_time: string;
  peak_time: string | null;
  end_time: string | null;
  classification: string | null;
  source_location: string | null;
  active_region: string | null;
  kp_max: number | null;
  source_url: string | null;
};


type SolarTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
};

function SolarTooltip({
  active,
  label,
  payload,
}: SolarTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltip title={label ?? "Solar activity"}>
      {payload.map((item, index) => (
        <p
          key={`${item.name}-${index}`}
          style={{ color: item.color ?? "#D4D4D4" }}
        >
          {item.name}: {item.value ?? 0}
        </p>
      ))}
    </ChartTooltip>
  );
}


type EventResponse = { count: number; data: SolarEvent[] };
type Filter = "ALL" | "FLR" | "GST";
const API = "http://127.0.0.1:8000";
const panel = "border border-[#303030] bg-[#151515]";
const control = "astra-control min-w-[155px] font-mono focus:border-[#F59E0B]";

function displayTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB", {
    timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function eventColor(event: SolarEvent) {
  if (event.event_type === "GST") return "#A78BFA";
  if (event.classification?.startsWith("X")) return "#F87171";
  if (event.classification?.startsWith("M")) return "#F59E0B";
  return "#60A5FA";
}

function exportCSV(events: SolarEvent[]) {
  const fields: (keyof SolarEvent)[] = [
    "event_id", "event_type", "start_time", "peak_time", "end_time",
    "classification", "source_location", "active_region", "kp_max", "source_url",
  ];
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [fields.join(","), ...events.map(event => fields.map(field => quote(event[field])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "astra_solarpulse_filtered.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SolarPulse() {
  const [events, setEvents] = useState<SolarEvent[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (filter !== "ALL") params.set("event_type", filter);
        const response = await fetch(`${API}/api/solarpulse/events?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload: EventResponse = await response.json();
        if (!Array.isArray(payload.data)) throw new Error("Expected API response with data array");
        if (!controller.signal.aborted) setEvents(payload.data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setEvents([]);
          setError(err instanceof Error ? err.message : "Could not load events");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filter, refreshKey]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter(event => !term || [
      event.event_id, event.classification, event.source_location, event.active_region,
    ].some(value => String(value ?? "").toLowerCase().includes(term)));
  }, [events, search]);

  const metrics = useMemo(() => [
    { label: "EVENTS", value: visible.length, color: "#E5E5E5" },
    { label: "SOLAR FLARES", value: visible.filter(e => e.event_type === "FLR").length, color: "#F59E0B" },
    { label: "GEOMAGNETIC STORMS", value: visible.filter(e => e.event_type === "GST").length, color: "#A78BFA" },
    { label: "X-CLASS FLARES", value: visible.filter(e => e.event_type === "FLR" && e.classification?.startsWith("X")).length, color: "#F87171" },
  ], [visible]);

  const timeline = useMemo(() => {
    const byDay = new Map<string, { date: string; flares: number; storms: number }>();
    for (const event of visible) {
      const day = event.start_time.slice(0, 10);
      const row = byDay.get(day) ?? { date: day, flares: 0, storms: 0 };
      if (event.event_type === "FLR") row.flares += 1;
      else row.storms += 1;
      byDay.set(day, row);
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [visible]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 text-[#E8E8E8]">
      <div className="grid shrink-0 grid-cols-2 gap-px border border-[#303030] bg-[#303030] xl:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="bg-[#171717] p-3">
            <p className="font-mono text-[9px] text-[#888888]">{metric.label}</p>
            <p className="mt-2 font-mono text-lg" style={{ color: metric.color }}>{loading ? "—" : metric.value}</p>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <section className={panel}>
          <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2">
            <span className="font-mono text-[10px] text-[#BBBBBB]">SPACE WEATHER / EVENT DISTRIBUTION</span>
            <Sun size={14} color="#F59E0B" />
          </div>
          <div className="h-[190px] p-2">
            {loading ? <div className="flex h-full items-center justify-center text-xs text-[#888888]">LOADING...</div>
              : timeline.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline}>
                    <CartesianGrid stroke="#303030" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(date: string) => date.slice(5)} tick={{ fill: "#888888", fontSize: 9 }} />
                    <YAxis allowDecimals={false} width={30} tick={{ fill: "#888888", fontSize: 9 }} />
                    <Tooltip 
                        content={<SolarTooltip />}
                        cursor={{ fill: "#FFFFFF", fillOpacity: 0.035 }} 
                    />
                    <Bar dataKey="flares" name="Solar flares" fill="#F59E0B" />
                    <Bar dataKey="storms" name="Geomagnetic storms" fill="#A78BFA" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-xs text-[#888888]">NO EVENT DATA</div>}
          </div>
        </section>
        <section className={panel}>
          <div className="border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">EVENT EXPLORER / FILTERS</div>
          <div className="flex flex-wrap items-end gap-2 p-3">
            <label className="flex min-w-[160px] flex-1 flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">SEARCH EVENT</span>
              <span className="astra-control flex w-full min-w-0 items-center gap-2 px-2">
                <Search size={13} color="#888888" />
                <input className="h-full w-full min-w-0 flex-1 bg-transparent text-xs outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="ID, class, region" />
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#888888]">EVENT TYPE</span>
              <select className={control} value={filter} onChange={e => setFilter(e.target.value as Filter)}>
                <option value="ALL">ALL EVENTS</option>
                <option value="FLR">SOLAR FLARES</option>
                <option value="GST">GEOMAGNETIC STORMS</option>
              </select>
            </label>
            <button className="astra-control font-mono text-[10px]" onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={12} /> REFRESH</button>
            <button disabled={loading || !!error || visible.length === 0} className="flex items-center gap-1 border border-[#383838] px-3 py-2 font-mono text-[10px] hover:bg-[#252525] disabled:opacity-40" onClick={() => exportCSV(visible)}><Download size={12} /> CSV</button>
          </div>
        </section>
        {error && <p className="border border-[#603535] p-3 text-xs text-[#F87171]">API ERROR: {error}</p>}
        <section className={panel}>
          <div className="flex items-center justify-between border-b border-[#303030] px-3 py-2 font-mono text-[10px] text-[#BBBBBB]">
            <span>SPACE WEATHER / EVENT RECORDS</span><span className="text-[#888888]">{loading ? "LOADING" : `${visible.length} ROWS`}</span>
          </div>
          <div className="max-h-[260px] overflow-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#222222] font-mono text-[10px] text-[#999999]">
                <tr>{["TYPE", "START (UTC)", "CLASS", "KP MAX", "REGION", "SOURCE"].map(label => <th key={label} className="p-3 font-normal">{label}</th>)}</tr>
              </thead>
              <tbody>
                {!loading && visible.map(event => (
                  <tr key={event.event_id} className="border-t border-[#292929] hover:bg-[#202020]">
                    <td className="p-3 font-mono" style={{ color: eventColor(event) }}>{event.event_type}</td>
                    <td className="p-3 font-mono">{displayTime(event.start_time)}</td>
                    <td className="p-3 font-mono">{event.classification ?? "—"}</td>
                    <td className="p-3 font-mono">{event.kp_max ?? "—"}</td>
                    <td className="p-3 font-mono">{event.active_region ?? event.source_location ?? "—"}</td>
                    <td className="p-3">{event.source_url?.startsWith("https://") ? <a className="text-[#60A5FA] hover:underline" href={event.source_url} target="_blank" rel="noopener noreferrer">NASA SOURCE</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !error && visible.length === 0 && <p className="p-5 text-xs text-[#888888]">NO MATCHING EVENTS</p>}
          </div>
          <div className="border-t border-[#303030] px-3 py-2 font-mono text-[10px] text-[#777777]">DISPLAYED: {visible.length} / QUERY LIMIT: 500</div>
        </section>
        <p className="pb-2 text-[10px] leading-5 text-[#888888]">SOURCE: NASA CCMC DONKI / locally stored records. Times displayed in UTC. Metrics and charts describe the returned records only (maximum 500), not all solar activity. KP MAX is the maximum reported index within each stored storm event, not a live Kp reading.</p>
      </div>
    </div>
  );
}
