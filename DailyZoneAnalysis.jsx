import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";

function monthLabelFromEncoded(encoded) {
  if (!encoded) return "";
  const s = String(encoded);
  let m = 1, y = 2025;
  if (s.length === 5) { m = parseInt(s[0], 10); y = parseInt(s.slice(1), 10); }
  else if (s.length === 6) { m = parseInt(s.slice(0, 2), 10); y = parseInt(s.slice(2), 10); }
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mm = Math.max(1, Math.min(12, m));
  return `${names[mm]}-${String(y).slice(-2)}`;
}

function extractZone(address = "") {
  // Handle both "Zone 01 (FM)" and "Z3 042" formats
  const zoneMatch = address.match(/Zone\s*(\d+)/i) || address.match(/Z(\d+)/i);
  if (zoneMatch) return `Zone ${zoneMatch[1]}`;
  if (address.toLowerCase().includes("vs")) return "Zone VS";
  return "OTHER";
}

function calculateZoneMetrics(records = [], selectedZone = "", selectedMonth = "") {
  const bulkRecord = records.find(r => 
    monthLabelFromEncoded(r.reading_month) === selectedMonth && 
    extractZone(r.address) === selectedZone && 
    r.customer_name.toLowerCase().includes("bulk")
  );
  
  const indivRecord = records.find(r => 
    monthLabelFromEncoded(r.reading_month) === selectedMonth && 
    extractZone(r.address) === selectedZone && 
    r.customer_name.toLowerCase().includes("indiv")
  );

  if (!bulkRecord || !indivRecord) return null;

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  return days.map(d => {
    const bulk = Number(bulkRecord.readings?.[d] || 0);
    const individual = Number(indivRecord.readings?.[d] || 0);
    const loss = bulk - individual;
    const lossPercent = bulk > 0 ? (loss / bulk * 100) : 0;
    return {
      day: parseInt(d),
      bulk,
      individual,
      loss,
      lossPercent: parseFloat(lossPercent.toFixed(1))
    };
  }).filter(d => d.bulk > 0 || d.individual > 0); // Only show days with data
}

export default function DailyZoneAnalysis({ records = [] }) {
  const months = React.useMemo(() => {
    const set = new Set(records.map(r => monthLabelFromEncoded(r.reading_month)).filter(Boolean));
    return Array.from(set).sort((a, b) => {
      const [ma, ya] = a.split("-"); const [mb, yb] = b.split("-");
      const order = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
      if (ya !== yb) return Number(`20${ya}`) - Number(`20${yb}`);
      return order[ma] - order[mb];
    });
  }, [records]);

  const zones = React.useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      const zone = extractZone(r.address);
      if (zone && zone !== "OTHER") set.add(zone);
    });
    return Array.from(set).sort();
  }, [records]);

  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [selectedZone, setSelectedZone] = React.useState("");
  const [dayRange, setDayRange] = React.useState([1, 23]);

  React.useEffect(() => {
    if (months.length && !selectedMonth) setSelectedMonth(months[0]);
    if (zones.length && !selectedZone) setSelectedZone(zones[0]);
  }, [months, zones, selectedMonth, selectedZone]);

  const zoneMetrics = React.useMemo(() => 
    calculateZoneMetrics(records, selectedZone, selectedMonth), 
    [records, selectedZone, selectedMonth]
  );

  const [minDay, maxDay] = dayRange;
  const visibleDays = React.useMemo(() => {
    if (!zoneMetrics) return [];
    return zoneMetrics.filter(d => d.day >= minDay && d.day <= maxDay);
  }, [zoneMetrics, minDay, maxDay]);

  const dailyStats = React.useMemo(() => {
    if (!visibleDays.length) return { total: 0, avgDaily: 0, peakDay: 0, avgLoss: 0, totalLoss: 0 };
    
    const totalBulk = visibleDays.reduce((sum, d) => sum + d.bulk, 0);
    const totalIndiv = visibleDays.reduce((sum, d) => sum + d.individual, 0);
    const totalLoss = visibleDays.reduce((sum, d) => sum + d.loss, 0);
    const avgDaily = totalBulk / visibleDays.length;
    const peakDay = Math.max(...visibleDays.map(d => d.bulk));
    const avgLoss = totalLoss / visibleDays.length;
    
    return { 
      total: totalBulk, 
      avgDaily, 
      peakDay, 
      avgLoss,
      totalLoss,
      efficiency: totalBulk > 0 ? ((totalIndiv / totalBulk) * 100).toFixed(1) : 0
    };
  }, [visibleDays]);

  if (!zoneMetrics) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No data available for the selected zone and month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Month</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-white">
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Zone</span>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-white">
                  {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <Button
              variant="outline"
              onClick={() => setDayRange([1, 23])}
              className="dark:border-gray-600 dark:text-white"
            >
              Reset Day Range
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Total Bulk (Selected Days)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--primary)] dark:text-white">{dailyStats.total.toLocaleString()} m³</div></CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Average/Day</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--primary)] dark:text-white">{dailyStats.avgDaily.toFixed(2)} m³</div></CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Peak Day</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--primary)] dark:text-white">{dailyStats.peakDay.toLocaleString()} m³</div></CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">System Efficiency</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-[var(--accent)] dark:text-white">{dailyStats.efficiency}%</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Daily Consumption Trend ({selectedZone || "-"}, {selectedMonth || "-"})</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleDays}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v, name) => {
                if (name === "Bulk Meter") return [`${Number(v).toLocaleString()} m³`, "Bulk"];
                if (name === "Individual Total") return [`${Number(v).toLocaleString()} m³`, "Individual"];
                if (name === "Loss") return [`${Number(v).toLocaleString()} m³`, "Loss"];
                return [v, name];
              }} />
              <Legend />
              <Area type="monotone" dataKey="bulk" name="Bulk Meter" stroke="#3b82f6" fill="rgba(59,130,246,0.3)" />
              <Area type="monotone" dataKey="individual" name="Individual Total" stroke="#10b981" fill="rgba(16,185,129,0.3)" />
              <Area type="monotone" dataKey="loss" name="Loss" stroke="#ef4444" fill="rgba(239,68,68,0.3)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Day range: {minDay} - {maxDay}
            </div>
            <div className="relative h-10">
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-[var(--accent)]"
                style={{
                  left: `${2 + (minDay - 1) / 22 * (100 - 4)}%`,
                  width: `${(maxDay - minDay) / 22 * (100 - 4)}%`
                }}
              />
              <input
                type="range"
                min={1}
                max={23}
                step={1}
                value={minDay}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v <= maxDay) setDayRange([v, maxDay]);
                }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-transparent appearance-none cursor-pointer"
                style={{ pointerEvents: "none" }}
                onMouseDown={(e) => e.currentTarget.style.pointerEvents = "auto"}
              />
              <input
                type="range"
                min={1}
                max={23}
                step={1}
                value={maxDay}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= minDay) setDayRange([minDay, v]);
                }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-transparent appearance-none cursor-pointer"
                style={{ pointerEvents: "none" }}
                onMouseDown={(e) => e.currentTarget.style.pointerEvents = "auto"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader><CardTitle className="text-gray-900 dark:text-white">Daily Performance Breakdown</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Day</th>
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Bulk (m³)</th>
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Individual (m³)</th>
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Loss (m³)</th>
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Loss %</th>
                <th className="py-2 pr-4 text-gray-900 dark:text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleDays.map((day) => (
                <tr key={day.day} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                  <td className="py-2 pr-4 font-medium">Day {day.day}</td>
                  <td className="py-2 pr-4">{day.bulk.toFixed(2)}</td>
                  <td className="py-2 pr-4">{day.individual.toFixed(2)}</td>
                  <td className={`py-2 pr-4 font-semibold ${day.loss < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {day.loss.toFixed(2)}
                  </td>
                  <td className={`py-2 pr-4 font-semibold ${day.loss < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(day.lossPercent).toFixed(1)}%
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      day.lossPercent < 0 ? 'bg-green-100 text-green-700' :
                      day.lossPercent < 10 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {day.lossPercent < 0 ? 'Gain' : day.lossPercent < 10 ? 'Normal' : 'High Loss'}
                    </span>
                  </td>
                </tr>
              ))}
              {visibleDays.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-gray-500 dark:text-gray-400">No data available for this selection.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}