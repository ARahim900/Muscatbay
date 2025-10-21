import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar } from "lucide-react";

export default function WaterSystemToggle({ activeView, onViewChange }) {
  const views = [
    {
      key: 'monthly',
      label: 'Monthly Dashboard',
      icon: BarChart3,
      description: 'Monthly trends and KPI analysis'
    },
    {
      key: 'daily',
      label: 'Daily Analysis',
      icon: Calendar,
      description: 'Daily consumption patterns and zone comparison'
    }
  ];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg mb-6 transition-colors duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Water System Analysis
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose your preferred analysis view
            </p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 transition-colors duration-300">
            {views.map((view) => {
              const isActive = activeView === view.key;
              const Icon = view.icon;
              
              return (
                <Button
                  key={view.key}
                  onClick={() => onViewChange(view.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? 'bg-[var(--accent)] text-white shadow-md transform scale-105' 
                      : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                  variant="ghost"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{view.label}</span>
                  <span className="sm:hidden">{view.key === 'monthly' ? 'Monthly' : 'Daily'}</span>
                </Button>
              );
            })}
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {views.find(v => v.key === activeView)?.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}