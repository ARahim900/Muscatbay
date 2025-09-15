import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, BarChart3, Minus, TrendingUp, Gauge } from "lucide-react";

function KpiCard({ icon: Icon, title, value, description, color }) {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${color.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color.text}`} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiCards({ data }) {
  const totals = data.reduce(
    (acc, day) => {
      acc.totalBulk += day.bulk;
      acc.totalIndividual += day.individual;
      acc.totalLoss += day.loss;
      return acc;
    },
    { totalBulk: 0, totalIndividual: 0, totalLoss: 0 }
  );

  const dailyAverage = data.length > 0 ? totals.totalBulk / data.length : 0;
  const efficiency = totals.totalBulk > 0 ? (totals.totalIndividual / totals.totalBulk) * 100 : 0;
  const lossPercent = totals.totalBulk > 0 ? (Math.abs(totals.totalLoss) / totals.totalBulk) * 100 : 0;

  const kpiData = [
    {
      icon: Droplets,
      title: "Zone Bulk Meter",
      value: `${Math.round(totals.totalBulk).toLocaleString()} m³`,
      description: "Total input",
      color: { bg: "bg-blue-100", text: "text-blue-600" }
    },
    {
      icon: BarChart3,
      title: "Individual Meters Total",
      value: `${Math.round(totals.totalIndividual).toLocaleString()} m³`,
      description: "Total accounted for consumption",
      color: { bg: "bg-green-100", text: "text-green-600" }
    },
    {
      icon: Minus,
      title: "Water Loss/Variance",
      value: `${Math.round(Math.abs(totals.totalLoss)).toLocaleString()} m³`,
      description: `${lossPercent.toFixed(1)}% of bulk total`,
      color: { bg: "bg-red-100", text: "text-red-600" }
    },
    {
      icon: TrendingUp,
      title: "Daily Average",
      value: `${Math.round(dailyAverage).toLocaleString()} m³`,
      description: "Average bulk consumption per day",
      color: { bg: "bg-yellow-100", text: "text-yellow-600" }
    },
    {
      icon: Gauge,
      title: "Zone Efficiency",
      value: `${efficiency.toFixed(1)}%`,
      description: "Individual / Bulk ratio",
      color: { bg: "bg-indigo-100", text: "text-indigo-600" }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpiData.map((kpi, index) => (
        <KpiCard key={index} {...kpi} />
      ))}
    </div>
  );
}