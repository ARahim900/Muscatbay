import React from 'react';
import { Button } from "@/components/ui/button";

export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) =>
      <Button
        key={tab.key}
        variant={activeTab === tab.key ? "default" : "outline"} className="bg-zinc-200 text-gray-900 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:text-accent-foreground h-10 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"





        onClick={() => onTabChange(tab.key)}>

          {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
          {tab.label}
        </Button>
      )}
    </div>);

}