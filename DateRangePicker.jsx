
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DateRangePicker({ startDate, endDate, onDateChange, onReset, dateFormat }) {
  const isMonthFormat = dateFormat === "MMM-yy";

  const handleDateChange = (e, field) => {
    let value = e.target.value;
    if (isMonthFormat) {
      const [year, month] = value.split('-');
      value = `${year}-${month}`;
    }
    if (field === 'start') {
      onDateChange(value, endDate);
    } else {
      onDateChange(startDate, value);
    }
  };
  
  const formatDateForInput = (dateString) => {
    if(!dateString) return '';
    if(isMonthFormat) {
        // expect YYYY-MM
        return dateString;
    }
    // expect YYYY-MM-DD
    return dateString;
  }

  return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type={isMonthFormat ? "month" : "date"}
              value={formatDateForInput(startDate)}
              onChange={(e) => handleDateChange(e, 'start')}
              className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <Input
              type={isMonthFormat ? "month" : "date"}
              value={formatDateForInput(endDate)}
              onChange={(e) => handleDateChange(e, 'end')}
              className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button
            onClick={onReset}
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
          >
            Reset Range
          </Button>
        </div>
      </div>
  );
}
