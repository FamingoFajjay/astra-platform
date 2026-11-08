import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  Globe2,
  Orbit,
  Radio,
  RefreshCw,
  Server,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import CosmicWatch from "./CosmicWatch";

type Module = {
  id: string;
  name: string;
  status: string;
};

const MODULES = [
  {
    id: "cosmicwatch",
    name: "CosmicWatch",
    subtitle: "NEAR-EARTH OBJECTS",
    description: "Asteroid close approaches and orbital data.",
    color: "#60A5FA",
    Icon: Orbit,
  },
  {
    id: "solarpulse",
    name: "SolarPulse",
    subtitle: "SPACE WEATHER",
    description: "Solar flares and geomagnetic activity.",
    color: "#F59E0B",
    Icon: Sun,
  },
  {
    id: "exoatlas",
    name: "ExoAtlas",
    subtitle: "EXOPLANET ARCHIVE",
    description: "Planetary systems and discovery records.",
    color: "#A78BFA",
    Icon: Globe2,
  },
  {
    id: "astroalert",
    name: "AstroAlert",
    subtitle: "ASTRONOMICAL EVENTS",
    description: "Transient events and observation alerts.",
    color: "#FB7185",
    Icon: Radio,
  },
];

function App() {
  const [modules, setModules] = useState<Module[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    try {
      const health = await fetch("http://127.0.0.1:8000/health");
      if (!health.ok) throw new Error("Health check failed");

      const result = await health.json();
      if (result.status !== "ok") throw new Error("API unhealthy");

      const response = await fetch("http://127.0.0.1:8000/modules");
      if (!response.ok) throw new Error("Modules request failed");

      const data: Module[] = await response.json();
      setModules(data);
      setApiOnline(true);
    } catch (error) {
      console.error("ASTRA API error:", error);
      setApiOnline(false);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadData();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const selected = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#E8E8E8]">
      {/* HEADER */}
      <header className="border-b border-[#303030] bg-[#111111]">
        <div className="flex min-h-16 items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Orbit size={26} strokeWidth={1.6} />
            <div>
              <h1 className="text-lg font-semibold tracking-[0.16em]">
                ASTRA
              </h1>
              <p className="text-[9px] tracking-[0.14em] text-[#858585]">
                ASTRONOMY INTELLIGENCE PLATFORM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-[10px] text-[#777777] sm:block">
              SYSTEM / DEVELOPMENT
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {apiOnline ? (
                <Wifi size={14} color="#4ADE80" />
              ) : (
                <WifiOff size={14} color="#F87171" />
              )}
              <span className={apiOnline ? "text-[#4ADE80]" : "text-[#F87171]"}>
                {loading ? "CONNECTING" : apiOnline ? "API ONLINE" : "API OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <main className="p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-[#777777]">
              ASTRA / SYSTEM OVERVIEW
            </p>
            <h2 className="mt-1 text-lg font-medium">
              Observatory Console
            </h2>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#383838] bg-[#1A1A1A] px-3 py-2 text-xs hover:bg-[#252525] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>

        {/* SYSTEM STATUS */}
        <div className="mb-3 grid grid-cols-2 gap-px border border-[#303030] bg-[#303030] lg:grid-cols-4">
          {[
            {
              label: "API SERVICE",
              value: loading ? "CHECKING" : apiOnline ? "CONNECTED" : "OFFLINE",
              color: apiOnline ? "#4ADE80" : "#F87171",
              Icon: Server,
            },
            {
              label: "DATA MODULES",
              value: `${modules.length.toString().padStart(2, "0")} / 04`,
              color: "#60A5FA",
              Icon: Activity,
            },
            {
              label: "DATABASE",
              value: "NOT CONFIGURED",
              color: "#A3A3A3",
              Icon: Database,
            },
            {
              label: "DATA INGESTION",
              value: "NOT STARTED",
              color: "#A3A3A3",
              Icon: Radio,
            },
          ].map((item) => (
            <div key={item.label} className="bg-[#151515] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#888888]">
                  {item.label}
                </span>
                <item.Icon size={15} color="#777777" />
              </div>
              <p
                className="font-mono text-sm font-semibold"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* MODULES */}
        <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
          <section className="border border-[#303030] bg-[#111111]">
            <div className="border-b border-[#303030] px-4 py-3">
              <p className="font-mono text-[11px] tracking-wider text-[#BBBBBB]">
                DATA MODULES
              </p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {MODULES.map((module, index) => {
                const Icon = module.Icon;
                const active = activeModule === module.id;
                const configured = modules.some((m) => m.id === module.id);

                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`flex w-full items-center gap-3 border-b border-[#292929] px-4 py-4 text-left transition-colors last:border-b-0 ${
                      active ? "bg-[#262626]" : "hover:bg-[#1D1D1D]"
                    }`}
                  >
                    <Icon size={19} color={module.color} strokeWidth={1.7} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{module.name}</p>
                      <p className="mt-1 font-mono text-[9px] text-[#777777]">
                        {module.subtitle}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-[#777777]">
                      {configured ? "READY" : `0${index + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* MAIN DATA PANEL */}
          <section className="flex h-[520px] min-h-0 min-w-0 flex-col overflow-hidden border border-[#303030] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-[#303030] px-4 py-3">
              <span className="font-mono text-[11px] tracking-wider">
                {selected ? selected.subtitle : "SYSTEM MONITOR"}
              </span>
              <span className="font-mono text-[10px] text-[#777777]">
                {selected ? "MODULE PREVIEW" : "NO ACTIVE MODULE"}
              </span>
            </div>

            {selected?.id === "cosmicwatch" ? (
              <div className="min-h-0 flex-1 overflow-hidden p-3">
                <CosmicWatch />
              </div>
            ) : selected ? (
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-3">
                  <selected.Icon size={28} color={selected.color} />
                  <div>
                    <h3 className="text-xl font-medium">{selected.name}</h3>
                    <p className="text-xs text-[#888888]">
                      {selected.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-px border border-[#303030] bg-[#303030] sm:grid-cols-3">
                  {["DATA SOURCE", "RECORDS", "PIPELINE"].map((label) => (
                    <div key={label} className="bg-[#171717] p-4">
                      <p className="font-mono text-[10px] text-[#777777]">
                        {label}
                      </p>
                      <p className="mt-3 font-mono text-sm text-[#AAAAAA]">
                        NOT AVAILABLE
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-1 items-center justify-center border border-dashed border-[#333333] bg-[#141414] p-6 text-center">
                  <div>
                    <Activity size={24} className="mx-auto mb-3 text-[#666666]" />
                    <p className="text-sm text-[#BBBBBB]">
                      Data visualization not initialized
                    </p>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-[#777777]">
                      Astronomical datasets, charts, and monitoring tools
                      will be connected during development.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <Orbit size={42} strokeWidth={1} color="#555555" />
                <p className="mt-5 font-mono text-sm text-[#BBBBBB]">
                  SELECT A DATA MODULE
                </p>
                <p className="mt-2 text-xs text-[#777777]">
                  Choose a module from the navigation panel.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* LOWER PANELS */}
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="min-h-0 self-start overflow-hidden border border-[#303030] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-[#303030] px-4 py-3">
              <span className="font-mono text-[11px]">DATA PIPELINE</span>
              <Database size={14} color="#777777" />
            </div>
            <div className="p-4">
              {MODULES.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between border-b border-[#292929] py-3 last:border-0"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className="h-1.5 w-1.5"
                      style={{ backgroundColor: module.color }}
                    />
                    {module.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#777777]">
                    NOT INITIALIZED
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#303030] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-[#303030] px-4 py-3">
              <span className="font-mono text-[11px]">SYSTEM LOG</span>
              <Activity size={14} color="#777777" />
            </div>
            <div className="space-y-3 p-4 font-mono text-[11px]">
              <p className="text-[#888888]">
                <span className="text-[#60A5FA]">[INFO]</span>{" "}
                ASTRA frontend initialized
              </p>
              <p className="text-[#888888]">
                <span className={apiOnline ? "text-[#4ADE80]" : "text-[#F87171]"}>
                  {apiOnline ? "[OK]" : "[ERROR]"}
                </span>{" "}
                Backend API {apiOnline ? "connected" : "unavailable"}
              </p>
              <p className="text-[#888888]">
                <span className="text-[#F59E0B]">[PENDING]</span>{" "}
                Database initialization
              </p>
              <p className="text-[#888888]">
                <span className="text-[#F59E0B]">[PENDING]</span>{" "}
                Astronomy data ingestion
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#303030] pt-3 font-mono text-[10px] text-[#666666]">
          <span>ASTRA / DEVELOPMENT BUILD 0.1.0</span>
          <span className="flex items-center gap-1">
            DATA SOURCES PENDING <ArrowUpRight size={12} />
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
