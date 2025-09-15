
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function StatsGrid({ stats }) {
  const getIconColor = (index) => {
    const colors = ['text-yellow-600', 'text-green-600', 'text-blue-600', 'text-red-600', 'text-purple-600', 'text-teal-600'];
    return colors[index % colors.length];
  };

  const getBgColor = (index) => {
    const colors = ['bg-yellow-100', 'bg-green-100', 'bg-blue-100', 'bg-red-100', 'bg-purple-100', 'bg-teal-100'];
    return colors[index % colors.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) =>
      <Card key={index} className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${getBgColor(index)} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${getIconColor(index)}`} />
              </div>
              <div>
                <p className="text-gray-600 text-xs font-thin dark:text-gray-400">{stat.label}</p>
                <p className="text-[#453f4b] text-xl font-bold dark:text-white">{stat.value}</p>
                {stat.subtitle &&
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.subtitle}</p>
              }
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>);

}