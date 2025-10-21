import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BarChart3, Check, Sparkles } from "lucide-react";

export default function SmartFilterButton({ label = "Smart Filter", options = [], value, onChange }) {
  const current = options.find(o => o.value === value) || options[0] || { label: "Select", description: "" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="relative overflow-hidden rounded-full px-6 py-3 font-medium text-white shadow-lg
                     bg-[#00D2B3] hover:bg-[#00D2B3]/90
                     transition-all duration-200 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{label}: {current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
          Select what the chart should display
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />
        {options.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-start gap-3 py-3 px-3 cursor-pointer rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="mt-0.5">
              <BarChart3 className="w-4 h-4 text-[#00D2B3]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">{opt.label}</span>
                {value === opt.value && (
                  <div className="w-5 h-5 bg-[#00D2B3] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              {opt.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}