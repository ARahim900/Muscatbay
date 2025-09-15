import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot
} from "recharts";

export default function ConsumptionTrendChart({ data, selectedZones, records, dateRange }) {
  const isSingleZone = selectedZones.length === 1;

  // Detect anomalies for single zone mode
  const detectAnomalies = () => {
    if (!isSingleZone) return [];
    
    const losses = data.map(d => d.loss);
    const mean = losses.reduce((sum, val) => sum + val, 0) / losses.length;
    const variance = losses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / losses.length;
    const stdDev = Math.sqrt(variance);
    const threshold = 2;
    
    return data.filter(d => Math.abs(d.loss - mean) > threshold * stdDev);
  };

  const anomalies = detectAnomalies();

  // Multi-zone data preparation
  const getMultiZoneData = () => {
    const days = Array.from({ length: dateRange[1] - dateRange[0] + 1 }, 
      (_, i) => dateRange[0] + i);
    
    return days.map(day => {
      const dayData = { day, date: `Jun ${day}` };
      
      selectedZones.forEach(zone => {
        const zoneRecord = records.find(r => r.zone === zone && r.day === day);
        dayData[zone] = zoneRecord ? zoneRecord.l2_total_m3 : 0;
      });
      
      return dayData;
    });
  };

  const chartColors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];

  if (isSingleZone) {
    return (
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Daily Water Distribution Trend
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stacked view showing individual consumption and water loss
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="individualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(value) => `Day ${value}`}
                  stroke="#6b7280"
                />
                <YAxis 
                  tickFormatter={(value) => `${value}`}
                  stroke="#6b7280"
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} m³`,
                    name === 'individual' ? 'Individual Total' : 'Water Loss'
                  ]}
                  labelFormatter={(day) => `Day ${day}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="individual" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="url(#individualGrad)"
                  name="Individual Total"
                />
                <Area 
                  type="monotone" 
                  dataKey="loss" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="url(#lossGrad)"
                  name="Water Loss"
                />
                
                {/* Anomaly markers */}
                {anomalies.map((anomaly, index) => (
                  <ReferenceDot
                    key={index}
                    x={anomaly.day}
                    y={anomaly.bulk}
                    r={4}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-zone mode
  const multiZoneData = getMultiZoneData();
  
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Zone Comparison - Bulk Consumption
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Comparing bulk consumption patterns across selected zones
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={multiZoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="day" 
                tickFormatter={(value) => `Day ${value}`}
                stroke="#6b7280"
              />
              <YAxis 
                tickFormatter={(value) => `${value}`}
                stroke="#6b7280"
              />
              <Tooltip 
                formatter={(value, name) => [`${Number(value).toFixed(2)} m³`, name.replace(/_/g, " ")]}
                labelFormatter={(day) => `Day ${day}`}
              />
              <Legend formatter={(value) => value.replace(/_/g, " ")} />
              {selectedZones.map((zone, index) => (
                <Line
                  key={zone}
                  type="monotone"
                  dataKey={zone}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={2}
                  dot={{ fill: chartColors[index % chartColors.length], r: 3 }}
                  name={zone.replace(/_/g, " ")}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}