
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis,
  Label
} from "recharts";

function CircularGauge({ title, value, unit, color, percentage, description }) {
  // Clamp percentage and convert to arc angle (0..360) so the gauge fills proportionally
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
  const start = 90; // top
  const end = start - (pct / 100) * 360; // smaller arc for smaller percentages

  const chartData = [{
    name: title,
    value: pct,
    fill: color
  }];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mx-auto aspect-square max-h-[200px] w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={chartData}
              startAngle={start}
              endAngle={end}
              innerRadius="60%"
              outerRadius="90%"
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                className="first:fill-muted last:fill-background"
                polarRadius={[86, 74]}
              />
              <RadialBar 
                dataKey="value" 
                background={{ fill: "#e5e7eb" }}
                cornerRadius={8}
              />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 12}
                            className="fill-gray-900 dark:fill-white text-2xl font-bold"
                          >
                            {value.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 4}
                            className="fill-gray-500 dark:fill-gray-400 text-sm"
                          >
                            {unit}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-gray-600 dark:fill-gray-300 text-xs"
                          >
                            {pct.toFixed(1)}%
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConsumptionGauges({ data }) {
  const totals = data.reduce(
    (acc, day) => {
      acc.totalBulk += day.bulk;
      acc.totalIndividual += day.individual;
      acc.totalLoss += day.loss;
      return acc;
    },
    { totalBulk: 0, totalIndividual: 0, totalLoss: 0 }
  );

  const individualPercent = totals.totalBulk > 0 ? (totals.totalIndividual / totals.totalBulk) * 100 : 0;
  const lossPercent = totals.totalBulk > 0 ? Math.abs(totals.totalLoss / totals.totalBulk) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Zone Bulk Meter Total - always 100% */}
      <CircularGauge
        title="Zone Bulk Meter Total"
        value={Math.round(totals.totalBulk)}
        unit="m³"
        color="#3b82f6"
        percentage={100}
        description="Total water entering selected zone(s)"
      />

      {/* Individual Meters Sum Total - percentage of bulk */}
      <CircularGauge
        title="Individual Meters Sum Total"
        value={Math.round(totals.totalIndividual)}
        unit="m³"
        color="#10b981"
        percentage={individualPercent}
        description="Successfully recorded by individual meters"
      />

      {/* Water Loss Distribution - percentage of bulk, always red */}
      <CircularGauge
        title="Water Loss Distribution"
        value={Math.round(Math.abs(totals.totalLoss))}
        unit="m³"
        color="#ef4444"
        percentage={lossPercent}
        description="Unaccounted for water"
      />
    </div>
  );
}
