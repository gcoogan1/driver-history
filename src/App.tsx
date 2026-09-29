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

function App() {
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState("");

  useEffect(() => {
    fetch(SHEET_URL)
      .then((response) => response.text())
      .then((csv) => {
        const rows = csv
          .trim()
          .split("\n")
          .map((row) => row.split(",").map((cell) => cell.trim()));

        setSheetData(rows);

        if (rows.length > 1) {
          setSelectedDriver(rows[1][0]);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading spreadsheet:", error);
        setLoading(false);
      });
  }, []);

  const rounds = useMemo(() => sheetData[0] ?? [], [sheetData]);

  const drivers = useMemo(() => {
    return sheetData
      .slice(1)
      .map((row) => row[0])
      .filter(Boolean);
  }, [sheetData]);

  const selectedDriverRow = useMemo(() => {
    return sheetData.find((row) => row[0] === selectedDriver);
  }, [sheetData, selectedDriver]);

  const driverHistory = useMemo(() => {
    if (!selectedDriverRow) {
      return [];
    }

    return rounds.slice(1).map((round, index) => {
      const value = selectedDriverRow[index + 1];

      return {
        round,
        position: value === "" || value === undefined ? null : Number(value),
      };
    });
  }, [rounds, selectedDriverRow]);

  return (
    <main style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Driver History</h1>

        <p style={styles.subtitle}>
          Select a driver to view their race history.
        </p>

        {loading ? (
          <p>Loading spreadsheet...</p>
        ) : (
          <>
            <label htmlFor="driver-select" style={styles.label}>
              Driver
            </label>

            <select
              id="driver-select"
              value={selectedDriver}
              onChange={(event) => setSelectedDriver(event.target.value)}
              style={styles.select}
            >
              {drivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>

            {selectedDriver && (
              <section style={styles.chartSection}>
                <h2 style={styles.driverName}>{selectedDriver}</h2>

                <div style={styles.chart}>
                  <ResponsiveContainer width="100%" height={450}>
                    <LineChart
                      data={driverHistory}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid stroke="#333" strokeDasharray="3 3" />

                      <XAxis
                        dataKey="round"
                        stroke="#999"
                        tick={{ fill: "#aaa" }}
                      />

                      <YAxis
                        reversed
                        allowDecimals={false}
                        stroke="#999"
                        tick={{ fill: "#aaa" }}
                        label={{
                          value: "Position",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#aaa",
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f1f1f",
                          border: "1px solid #444",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        labelStyle={{ color: "#aaa" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value, name, item, _index, payload) => {
                          console.log("Tooltip payload:", {
                            value,
                            name,
                            item,
                            payload,
                          });

                          return [value, "Position"];
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="position"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={{
                          r: 6,
                          fill: "#3b82f6",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 8,
                          fill: "#60a5fa",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#111",
    color: "#fff",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  },

  content: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  title: {
    fontSize: "32px",
    marginBottom: "8px",
  },

  subtitle: {
    color: "#999",
    marginBottom: "30px",
  },

  label: {
    display: "block",
    color: "#aaa",
    marginBottom: "8px",
  },

  select: {
    backgroundColor: "#1f1f1f",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "6px",
    padding: "10px 12px",
    fontSize: "16px",
    width: "100%",
    maxWidth: "320px",
    minWidth: 0,
    boxSizing: "border-box" as const,
    cursor: "pointer",
  },

  chartSection: {
    marginTop: "40px",
    backgroundColor: "#181818",
    border: "1px solid #292929",
    borderRadius: "12px",
    padding: "24px",
  },

  driverName: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "24px",
  },

  chart: {
    width: "100%",
    minWidth: 0,
    height: "450px",
  },
};

export default App;
