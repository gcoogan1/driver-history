import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/18MuBwVC5GOdHprdlMozLfOAh9SyOFt7AmY07_uyeCRI/export?format=csv&gid=1892456350";

// Handles quoted cells (e.g. "Smith, John") that a plain split(",") would break.
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x !== ""));
}

function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

type Point = { round: string; rating: number | null };

function App() {
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch(SHEET_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((csv) => {
        const rows = parseCsv(csv);
        setSheetData(rows);
        if (rows.length > 1) setSelectedDriver(rows[1][0]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading spreadsheet:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  const rounds = useMemo(() => sheetData[0] ?? [], [sheetData]);

  const drivers = useMemo(
    () =>
      sheetData
        .slice(1)
        .map((row) => row[0])
        .filter(Boolean),
    [sheetData]
  );

  const selectedDriverRow = useMemo(
    () => sheetData.slice(1).find((row) => row[0] === selectedDriver),
    [sheetData, selectedDriver]
  );

  const driverHistory: Point[] = useMemo(() => {
    if (!selectedDriverRow) return [];
    return rounds.slice(1).map((round, index) => {
      const value = selectedDriverRow[index + 1];
      const num = Number(value);
      return {
        round,
        rating: value === "" || value === undefined || isNaN(num) ? null : num,
      };
    });
  }, [rounds, selectedDriverRow]);

  const stats = useMemo(() => {
    const rated = driverHistory
      .map((p) => p.rating)
      .filter((r): r is number => r !== null);
    if (!rated.length) return null;
    const current = rated[rated.length - 1];
    const previous = rated.length > 1 ? rated[rated.length - 2] : null;
    return {
      current,
      change: previous === null ? null : current - previous,
      peak: Math.max(...rated),
      races: rated.length,
    };
  }, [driverHistory]);

  // Zoom the y-axis to the data so small changes are visible, clamped to 0–100.
  const yDomain = useMemo<[number, number]>(() => {
    const rated = driverHistory
      .map((p) => p.rating)
      .filter((r): r is number => r !== null);
    if (!rated.length) return [0, 100];
    const min = Math.max(0, Math.floor((Math.min(...rated) - 8) / 5) * 5);
    const max = Math.min(100, Math.ceil((Math.max(...rated) + 8) / 5) * 5);
    return [min, max];
  }, [driverHistory]);

  const changeText =
    stats?.change == null
      ? null
      : stats.change === 0
      ? "No change"
      : `${stats.change > 0 ? "+" : ""}${stats.change} since last round`;
  const changeClass =
    stats?.change == null || stats.change === 0
      ? "flat"
      : stats.change > 0
      ? "up"
      : "down";

  return (
    <main className="dh">
      <style>{css}</style>

      <div className="dh-content">
        <header className="dh-header">
          <h1>Driver history</h1>
          <p>Pick a driver to see how their rating has moved round by round.</p>
        </header>

        {loading && <p className="dh-status">Loading spreadsheet…</p>}

        {error && (
          <p className="dh-status dh-error">
            Couldn't load the spreadsheet. Check your connection and refresh the
            page.
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="dh-field">
              <label htmlFor="driver-select">Driver</label>
              <select
                id="driver-select"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
              >
                {drivers.map((driver) => (
                  <option key={driver} value={driver}>
                    {driver}
                  </option>
                ))}
              </select>
            </div>

            {selectedDriver && (
              <section className="dh-panel">
                <div className="dh-hero">
                  <div>
                    <h2>{selectedDriver}</h2>
                    {changeText && (
                      <p className={`dh-change ${changeClass}`}>{changeText}</p>
                    )}
                  </div>
                  {stats && (
                    <div className="dh-rating" aria-label="Current rating">
                      {stats.current}
                    </div>
                  )}
                </div>

                {stats && (
                  <dl className="dh-stats">
                    <div>
                      <dt>Current</dt>
                      <dd>{stats.current}</dd>
                    </div>
                    <div>
                      <dt>Peak</dt>
                      <dd>{stats.peak}</dd>
                    </div>
                    <div>
                      <dt>Races</dt>
                      <dd>{stats.races}</dd>
                    </div>
                  </dl>
                )}

                {stats ? (
                  <div className="dh-chart">
                    <ResponsiveContainer
                      width="100%"
                      height={isMobile ? 260 : 380}
                    >
                      <LineChart
                        data={driverHistory}
                        margin={{
                          top: 12,
                          right: isMobile ? 12 : 24,
                          left: isMobile ? -12 : 0,
                          bottom: 4,
                        }}
                      >
                        <CartesianGrid
                          stroke="#262b33"
                          strokeDasharray="2 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="round"
                          stroke="#3a414c"
                          tick={{ fill: "#8b93a0", fontSize: isMobile ? 11 : 12 }}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={isMobile ? 24 : 12}
                        />
                        <YAxis
                          domain={yDomain}
                          allowDecimals={false}
                          stroke="#3a414c"
                          tick={{ fill: "#8b93a0", fontSize: isMobile ? 11 : 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={isMobile ? 40 : 44}
                        />
                        <Tooltip
                          cursor={{ stroke: "#3a414c" }}
                          contentStyle={{
                            backgroundColor: "#16191e",
                            border: "1px solid #303640",
                            borderRadius: 8,
                            color: "#e9ecef",
                          }}
                          labelStyle={{ color: "#8b93a0" }}
                          itemStyle={{ color: "#e9ecef" }}
                          formatter={(value) => [value as number, "Rating"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="#f2b134"
                          strokeWidth={2.5}
                          dot={{
                            r: isMobile ? 3 : 4,
                            fill: "#f2b134",
                            stroke: "#16191e",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: isMobile ? 6 : 7,
                            fill: "#f2b134",
                            stroke: "#fff",
                            strokeWidth: 2,
                          }}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="dh-status">No ratings recorded for this driver yet.</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const css = `
.dh {
  --bg: #0e1013;
  --panel: #16191e;
  --line: #262b33;
  --text: #e9ecef;
  --muted: #8b93a0;
  --accent: #f2b134;
  --up: #5fd08a;
  --down: #ef6b6b;

  box-sizing: border-box;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
  padding: 20px 16px calc(32px + env(safe-area-inset-bottom, 0px));
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.dh *, .dh *::before, .dh *::after { box-sizing: border-box; }
.dh-content { max-width: 880px; margin: 0 auto; }

.dh-header h1 {
  margin: 0 0 6px;
  font-size: clamp(1.5rem, 5vw, 2rem);
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.dh-header p {
  margin: 0 0 24px;
  color: var(--muted);
  line-height: 1.5;
  max-width: 46ch;
}

.dh-field { margin-bottom: 20px; }
.dh-field label {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 0.875rem;
}
.dh-field select {
  width: 100%;
  min-height: 48px;               /* comfortable touch target */
  padding: 0 40px 0 14px;
  font-size: 16px;                /* prevents iOS zoom-on-focus */
  color: var(--text);
  background-color: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%238b93a0' stroke-width='2'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
}
.dh-field select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
@media (min-width: 600px) {
  .dh-field select { max-width: 340px; }
}

.dh-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
}
@media (min-width: 600px) {
  .dh { padding: 40px 24px 48px; }
  .dh-panel { padding: 24px; }
}

.dh-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.dh-hero h2 {
  margin: 0;
  font-size: clamp(1.25rem, 4.5vw, 1.625rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.dh-rating {
  font-size: clamp(2.5rem, 12vw, 3.75rem);
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}
.dh-change { margin: 6px 0 0; font-size: 0.875rem; }
.dh-change.up { color: var(--up); }
.dh-change.down { color: var(--down); }
.dh-change.flat { color: var(--muted); }

.dh-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 20px 0;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.dh-stats > div + div { border-left: 1px solid var(--line); padding-left: 16px; }
.dh-stats dt { color: var(--muted); font-size: 0.8125rem; }
.dh-stats dd {
  margin: 2px 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dh-chart { width: 100%; min-width: 0; }
/* Stop the chart from selecting text / flashing on tap */
.dh-chart svg { -webkit-tap-highlight-color: transparent; }

.dh-status { color: var(--muted); margin: 16px 0 0; }
.dh-error { color: var(--down); }
`;

export default App;
