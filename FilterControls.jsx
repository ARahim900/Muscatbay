import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function FilterControls({
  // Safe defaults to avoid spreading undefined/null
  selectedZones = [],
  onZonesChange = () => {},
  availableZones = [],
  dateRange = [1, 30],
  onDateRangeChange = () => {},
  onReset = () => {},
  maxDays = 30,
  minDay = 1,
  availableDates = { month: "", year: "" },
  // Month selection (optional but supported)
  availableMonths = [],
  selectedMonthKey = null,
  onMonthChange = () => {},
}) {
  const safeSelected = Array.isArray(selectedZones) ? selectedZones : [];
  const safeZones = Array.isArray(availableZones) ? availableZones : [];
  const [start, end] = Array.isArray(dateRange) && dateRange.length === 2 ? dateRange : [minDay, maxDays];

  const toggleZone = (zone) => {
    const exists = safeSelected.includes(zone);
    const next = exists ? safeSelected.filter((z) => z !== zone) : [...safeSelected, zone];
    onZonesChange(next);
  };

  const handleSliderChange = (newRange) => {
    onDateRangeChange(newRange);
  };

  // Generate day labels for display (show every 5th day to avoid clutter)
  const dayLabels = React.useMemo(() => {
    const labels = [];
    const step = Math.max(1, Math.floor(maxDays / 6)); // Show about 6 labels max
    for (let day = minDay; day <= maxDays; day += step) {
      labels.push(day);
    }
    if (labels[labels.length - 1] !== maxDays) {
      labels.push(maxDays);
    }
    return labels;
  }, [minDay, maxDays]);

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Top row: Month picker + Reset */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Month</span>
            <Select
              value={selectedMonthKey || undefined}
              onValueChange={(v) => onMonthChange(v)}
            >
              <SelectTrigger className="w-44 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-white">
                {availableMonths.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onReset}
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
          >
            Reset Range
          </Button>
        </div>

        {/* Zones multi-select as chips */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-300">Zones</div>
          <div className="flex flex-wrap gap-2">
            {safeZones.length === 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">No zones available for this month.</span>
            ) : (
              safeZones.map((zone) => {
                const active = safeSelected.includes(zone);
                return (
                  <Button
                    key={zone}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleZone(zone)}
                    className={
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    }
                  >
                    {zone.replace(/_/g, " ")}
                  </Button>
                );
              })
            )}
          </div>
        </div>

        {/* Enhanced Day Range Slider (similar to monthly dashboard) */}
        <div className="flex flex-col gap-4 flex-1 max-w-5xl w-full">
          <span className="text-sm text-gray-600 dark:text-gray-300 text-center">
            Day {start} - Day {end} of {availableDates.month || "-"} {availableDates.year || "-"}
          </span>

          <div className="relative h-10 px-1 md:px-2 lg:px-4">
            {/* Background track */}
            <div className="absolute top-1/2 left-2 right-2 h-5 bg-gray-200 dark:bg-gray-600 rounded-full -translate-y-1/2"></div>

            {/* Selected range track */}
            <div className="bg-[var(--accent)] absolute top-1/2 h-5 rounded-full -translate-y-1/2 transition-all duration-200"
              style={{
                left: `${2 + ((start - minDay) / (maxDays - minDay)) * (100 - 4)}%`,
                width: `${((end - start) / (maxDays - minDay)) * (100 - 4)}%`
              }}>
            </div>

            {/* Start slider */}
            <input
              type="range"
              min={minDay}
              max={maxDays}
              step={1}
              value={start}
              onChange={(e) => {
                const newStart = parseInt(e.target.value);
                if (newStart <= end) {
                  handleSliderChange([newStart, end]);
                }
              }}
              className="absolute top-1/2 left-0 right-0 w-full h-10 -translate-y-1/2 bg-transparent appearance-none cursor-pointer"
              style={{
                background: 'transparent',
                pointerEvents: 'none'
              }}
              onMouseDown={(e) => e.target.style.pointerEvents = 'auto'}
            />

            {/* End slider */}
            <input
              type="range"
              min={minDay}
              max={maxDays}
              step={1}
              value={end}
              onChange={(e) => {
                const newEnd = parseInt(e.target.value);
                if (newEnd >= start) {
                  handleSliderChange([start, newEnd]);
                }
              }}
              className="absolute top-1/2 left-0 right-0 w-full h-10 -translate-y-1/2 bg-transparent appearance-none cursor-pointer"
              style={{
                background: 'transparent',
                pointerEvents: 'none'
              }}
              onMouseDown={(e) => e.target.style.pointerEvents = 'auto'}
            />
          </div>

          {/* Day labels */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2 mt-1">
            {dayLabels.map((day) => (
              <span key={day} className="text-center">
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Numeric inputs for precision */}
        <div className="flex items-center gap-4 justify-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">From Day</span>
            <Input
              type="number"
              min={minDay}
              max={maxDays}
              value={start}
              onChange={(e) => {
                const newStart = Math.max(minDay, Math.min(Number(e.target.value) || minDay, end));
                handleSliderChange([newStart, end]);
              }}
              className="w-20 px-2 py-1 text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Day</span>
            <Input
              type="number"
              min={minDay}
              max={maxDays}
              value={end}
              onChange={(e) => {
                const newEnd = Math.min(maxDays, Math.max(Number(e.target.value) || maxDays, start));
                handleSliderChange([start, newEnd]);
              }}
              className="w-20 px-2 py-1 text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Custom slider styles */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 28px;
            width: 28px;
            background-color: var(--accent);
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            pointer-events: auto;
            transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
          }
          input[type="range"]::-moz-range-thumb {
            height: 28px;
            width: 28px;
            background-color: var(--accent);
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            pointer-events: auto;
            border: none;
          }
          input[type="range"]:active::-webkit-slider-thumb {
            transform: scale(1.15);
            box-shadow: 0 0 0 6px rgba(115, 190, 193, 0.2);
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 16px;
            background: transparent;
          }
          input[type="range"]::-moz-range-track {
            height: 16px;
            background: transparent;
            border: none;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}