import React from "react";

export default function FilterTabs({ label, options = [], value, onChange }) {
  return (
    <div className="w-full">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 -mb-px" aria-label={label}>
          {options.map((option) => {
            const isActive = value === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {option.label.replace(/(A-Values: |Loss Trend View: |Losses: )/g, '')}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}