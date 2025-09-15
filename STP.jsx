import React, { useState, useEffect, useMemo, useCallback } from "react";
import { STPOperation } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Settings, Droplets, TrendingUp, DollarSign, Truck, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import StatsGrid from "../components/shared/StatsGrid";

// Enhanced Custom Dropdown Component
const CustomMonthDropdown = ({ selectedMonth, onMonthChange, availableMonths }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectMonth = (monthKey) => {
    onMonthChange(monthKey);
    setIsOpen(false);
  };

  const selectedMonthData = availableMonths.find(m => m.key === selectedMonth);

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Month for Daily View
      </label>
      <button
        type="button"
        className="relative w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg pl-4 pr-10 py-3 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all duration-200 hover:shadow-xl"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selectedMonthData ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {selectedMonthData ? selectedMonthData.label : "Select a month"}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <ul
          className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl max-h-60 rounded-xl py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none backdrop-blur-lg"
          role="listbox"
        >
          {availableMonths.map((month) => (
            <li
              key={month.key}
              className="text-gray-900 dark:text-gray-100 cursor-pointer select-none relative py-3 pl-4 pr-10 hover:bg-[var(--accent)]/10 dark:hover:bg-[var(--accent)]/20 rounded-lg mx-2 transition-colors duration-150"
              onClick={() => handleSelectMonth(month.key)}
              role="option"
              aria-selected={selectedMonth === month.key}
            >
              <span className={`block truncate ${selectedMonth === month.key ? 'font-semibold text-[var(--accent)]' : 'font-normal'}`}>
                {month.label}
              </span>
              {selectedMonth === month.key && (
                <span className="text-[var(--accent)] absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function STP() {
  const [stpOperations, setStpOperations] = useState([]);
  const [startDate, setStartDate] = useState('2024-07');
  const [endDate, setEndDate] = useState('2025-07');
  const [selectedMonth, setSelectedMonth] = useState('2024-07');
  const [sliderRange, setSliderRange] = useState([1, 13]); // 13 months from July 2024 to July 2025
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Month mapping for slider - STP specific range
  const monthMapping = useMemo(() => [
    { value: 1, label: 'Jul-24', key: '2024-07' },
    { value: 2, label: 'Aug-24', key: '2024-08' },
    { value: 3, label: 'Sep-24', key: '2024-09' },
    { value: 4, label: 'Oct-24', key: '2024-10' },
    { value: 5, label: 'Nov-24', key: '2024-11' },
    { value: 6, label: 'Dec-24', key: '2024-12' },
    { value: 7, label: 'Jan-25', key: '2025-01' },
    { value: 8, label: 'Feb-25', key: '2025-02' },
    { value: 9, label: 'Mar-25', key: '2025-03' },
    { value: 10, label: 'Apr-25', key: '2025-04' },
    { value: 11, label: 'May-25', key: '2025-05' },
    { value: 12, label: 'Jun-25', key: '2025-06' },
    { value: 13, label: 'Jul-25', key: '2025-07' }
  ], []);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('storage', handleThemeChange);

    // Initial check for documentElement class
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    // Observer to react to class changes on the documentElement (e.g., from a global theme toggle)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          setTheme(newTheme);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    loadSTPData();

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const loadSTPData = async () => {
    setIsLoading(true);
    try {
      const operations = await STPOperation.list();
      setStpOperations(operations);
    } catch (error) {
      console.error("Error loading STP data:", error);
    }
    setIsLoading(false);
  };

  // Get months in range helper
  const getMonthsInRange = useCallback((start, end) => {
    const months = [];
    const startYear = parseInt(start.split('-')[0]);
    const startMonth = parseInt(start.split('-')[1]);
    const endYear = parseInt(end.split('-')[0]);
    const endMonth = parseInt(end.split('-')[1]);

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;

      for (let month = monthStart; month <= monthEnd; month++) {
        const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const yearSuffix = year.toString().slice(-2);
        months.push(`${monthNames[month]}-${yearSuffix}`);
      }
    }
    return months;
  }, []);

  // Handle date range changes
  const handleDateChange = useCallback((newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Update slider to match date selection
    const startMonth = monthMapping.find((m) => m.key === newStartDate);
    const endMonth = monthMapping.find((m) => m.key === newEndDate);
    if (startMonth && endMonth) {
      setSliderRange([startMonth.value, endMonth.value]);
    }
  }, [monthMapping]);

  const handleSliderChange = useCallback((newRange) => {
    setSliderRange(newRange);

    // Convert slider values to date keys
    const startMonth = monthMapping.find((m) => m.value === newRange[0]);
    const endMonth = monthMapping.find((m) => m.value === newRange[1]);

    if (startMonth && endMonth) {
      setStartDate(startMonth.key);
      setEndDate(endMonth.key);
    }
  }, [monthMapping]);

  const handleReset = useCallback(() => {
    const defaultStart = '2024-07';
    const defaultEnd = '2025-07';
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSliderRange([1, 13]);
  }, []);

  // Filter operations based on selected date range
  const filteredOperations = useMemo(() => {
    return stpOperations.filter((op) => {
      const opMonthKey = format(new Date(op.date), 'yyyy-MM');
      const monthsInRange = getMonthsInRange(startDate, endDate);
      const opMonthLabel = format(new Date(op.date), 'MMM-yy');
      return monthsInRange.includes(opMonthLabel);
    });
  }, [stpOperations, startDate, endDate, getMonthsInRange]);

  const getSTPStats = () => {
    const totalInlet = filteredOperations.reduce((sum, op) => sum + (op.inlet_sewage || 0), 0);
    const totalTSE = filteredOperations.reduce((sum, op) => sum + (op.tse_for_irrigation || 0), 0);
    const totalTrips = filteredOperations.reduce((sum, op) => sum + (op.tanker_trips || 0), 0);
    const totalIncome = filteredOperations.reduce((sum, op) => sum + (op.generated_income || 0), 0);
    const totalSavings = filteredOperations.reduce((sum, op) => sum + (op.water_savings || 0), 0);
    const totalImpact = totalIncome + totalSavings;
    const efficiencyRate = totalInlet > 0 ? ((totalTSE / totalInlet) * 100).toFixed(1) : 0;

    const rangeLabel = `${monthMapping.find(m => m.key === startDate)?.label || startDate} - ${monthMapping.find(m => m.key === endDate)?.label || endDate}`;

    return [
      { label: 'INLET SEWAGE', value: `${totalInlet.toLocaleString()} m³`, subtitle: `Range: ${rangeLabel}`, icon: Droplets },
      { label: 'TSE FOR IRRIGATION', value: `${totalTSE.toLocaleString()} m³`, subtitle: 'Recycled water output', icon: Settings },
      { label: 'TANKER TRIPS', value: `${totalTrips.toLocaleString()} trips`, subtitle: 'Total discharge operations', icon: Truck },
      { label: 'GENERATED INCOME', value: `${totalIncome.toFixed(0)} OMR`, subtitle: 'From tanker discharge fees', icon: DollarSign },
      { label: 'WATER SAVINGS', value: `${totalSavings.toFixed(0)} OMR`, subtitle: 'By using recycled TSE water', icon: TrendingUp },
      { label: 'TOTAL ECONOMIC IMPACT', value: `${totalImpact.toFixed(0)} OMR`, subtitle: 'Combined savings + income', icon: TrendingUp },
      { label: 'TREATMENT EFFICIENCY', value: `${efficiencyRate}%`, subtitle: 'TSE output vs inlet ratio', icon: Settings },
      { label: 'DAILY AVERAGE INLET', value: `${filteredOperations.length > 0 ? (totalInlet / filteredOperations.length).toFixed(0) : 0} m³`, subtitle: 'Average daily input', icon: Droplets }
    ];
  };

  const getMonthlyChartData = () => {
    const monthlyData = {};
    filteredOperations.forEach((op) => {
      const monthKey = format(new Date(op.date), 'MMM-yy');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, inlet: 0, tse_output: 0, income: 0, savings: 0, tanker_trips: 0, total_impact: 0 };
      }
      monthlyData[monthKey].inlet += op.inlet_sewage || 0;
      monthlyData[monthKey].tse_output += op.tse_for_irrigation || 0;
      monthlyData[monthKey].income += op.generated_income || 0;
      monthlyData[monthKey].savings += op.water_savings || 0;
      monthlyData[monthKey].tanker_trips += op.tanker_trips || 0;
      monthlyData[monthKey].total_impact += (op.generated_income || 0) + (op.water_savings || 0);
    });

    // Sort chronologically
    return Object.values(monthlyData).sort((a, b) => {
      const [aMonth, aYear] = a.month.split('-');
      const [bMonth, bYear] = b.month.split('-');
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateA = new Date(`01-${monthOrder.indexOf(aMonth) + 1}-20${aYear}`);
      const dateB = new Date(`01-${monthOrder.indexOf(bMonth) + 1}-20${bYear}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getDailyOperations = () => stpOperations.filter((op) => format(new Date(op.date), 'yyyy-MM') === selectedMonth).sort((a, b) => new Date(a.date) - new Date(b.date));

  const availableMonths = useMemo(() => {
    const months = [...new Set(stpOperations.map((op) => format(new Date(op.date), 'yyyy-MM')))].sort();
    return months.map(monthKey => ({
      key: monthKey,
      label: format(new Date(`${monthKey}-01`), 'MMMM yyyy')
    }));
  }, [stpOperations]);

  const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const chartGridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
    color: theme === 'dark' ? '#f9fafb' : '#111827',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    boxShadow: theme === 'dark' 
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' 
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto"></div>
        <p className="mt-4 text-gray-900 dark:text-white">Loading STP data...</p>
      </div>
    </div>
  );

  const monthlyChartData = getMonthlyChartData();
  const dailyOperations = getDailyOperations();

  return (
    <div className="space-y-6">
      {/* Enhanced Date Range Controls - Similar to Water System */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex items-center gap-3 flex-1">
            <Input
              type="month"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="w-40 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            />
            <span className="text-gray-500 dark:text-gray-400 font-medium">to</span>
            <Input
              type="month"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="w-40 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            />
          </div>

          {/* Enhanced Range Slider */}
          <div className="flex flex-col gap-4 flex-1 max-w-5xl w-full">
            <span className="text-sm text-gray-600 dark:text-gray-300 text-center font-medium">
              {monthMapping.find((m) => m.value === sliderRange[0])?.label} - {monthMapping.find((m) => m.value === sliderRange[1])?.label}
            </span>

            <div className="relative h-12 px-2 lg:px-4">
              {/* Background track */}
              <div className="absolute top-1/2 left-2 right-2 h-6 bg-gray-200 dark:bg-gray-700 rounded-full -translate-y-1/2"></div>

              {/* Selected range track */}
              <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--color-success)] absolute top-1/2 h-6 rounded-full -translate-y-1/2 transition-all duration-300 shadow-lg"
                style={{
                  left: `${2 + (sliderRange[0] - 1) / 12 * (100 - 4)}%`,
                  width: `${(sliderRange[1] - sliderRange[0]) / 12 * (100 - 4)}%`
                }}>
              </div>

              {/* Start slider */}
              <input
                type="range"
                min={1}
                max={13}
                step={1}
                value={sliderRange[0]}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value);
                  if (newStart <= sliderRange[1]) {
                    handleSliderChange([newStart, sliderRange[1]]);
                  }
                }}
                className="absolute top-1/2 left-0 right-0 w-full h-12 -translate-y-1/2 bg-transparent appearance-none cursor-pointer"
                style={{ background: 'transparent', pointerEvents: 'none' }}
                onMouseDown={(e) => e.target.style.pointerEvents = 'auto'}
              />

              {/* End slider */}
              <input
                type="range"
                min={1}
                max={13}
                step={1}
                value={sliderRange[1]}
                onChange={(e) => {
                  const newEnd = parseInt(e.target.value);
                  if (newEnd >= sliderRange[0]) {
                    handleSliderChange([sliderRange[0], newEnd]);
                  }
                }}
                className="absolute top-1/2 left-0 right-0 w-full h-12 -translate-y-1/2 bg-transparent appearance-none cursor-pointer"
                style={{ background: 'transparent', pointerEvents: 'none' }}
                onMouseDown={(e) => e.target.style.pointerEvents = 'auto'}
              />
            </div>

            {/* Month labels */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
              {monthMapping.filter((_, index) => index % 2 === 0).map((month) => (
                <span key={month.value} className="text-center font-medium">
                  {month.label.split('-')[0]}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={handleReset}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] hover:from-[var(--primary)]/90 hover:to-[var(--accent)]/90 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Reset Range
          </Button>
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 32px;
          width: 32px;
          background: linear-gradient(135deg, var(--accent), var(--color-success));
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb {
          height: 32px;
          width: 32px;
          background: linear-gradient(135deg, var(--accent), var(--color-success));
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          pointer-events: auto;
        }
        input[type="range"]:active::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(115, 190, 193, 0.4), 0 0 0 6px rgba(115, 190, 193, 0.2);
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 24px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 24px;
          background: transparent;
          border: none;
        }
      `}</style>

      <StatsGrid stats={getSTPStats()} />

      <Card className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Water Treatment Volumes (m³)</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Sewage inlet vs TSE output comparison</p>
        </CardHeader>
        <CardContent className="h-96 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="inletGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="tseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="month" stroke={chartStrokeColor} fontSize={12} fontWeight={500} />
              <YAxis stroke={chartStrokeColor} fontSize={12} fontWeight={500} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                contentStyle={tooltipStyle} 
                formatter={(value, name) => [`${Number(value).toLocaleString()} m³`, name]}
                labelStyle={{ fontWeight: 600, color: theme === 'dark' ? '#f9fafb' : '#111827' }}
              />
              <Area 
                type="monotone" 
                dataKey="inlet" 
                name="Sewage Input" 
                stroke="var(--color-warning)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#inletGradient)" 
              />
              <Area 
                type="monotone" 
                dataKey="tse_output" 
                name="TSE Output" 
                stroke="var(--color-success)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#tseGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Monthly Economic Impact (OMR)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="month" stroke={chartStrokeColor} fontSize={12} fontWeight={500} />
                <YAxis stroke={chartStrokeColor} fontSize={12} fontWeight={500} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  formatter={(value, name) => [`${Number(value).toFixed(2)} OMR`, name]}
                  labelStyle={{ fontWeight: 600, color: theme === 'dark' ? '#f9fafb' : '#111827' }}
                />
                <Bar dataKey="income" stackId="financial" fill="var(--color-success)" name="Income" radius={[0, 0, 4, 4]} />
                <Bar dataKey="savings" stackId="financial" fill="var(--accent)" name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              Monthly Tanker Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="month" stroke={chartStrokeColor} fontSize={12} fontWeight={500} />
                <YAxis stroke={chartStrokeColor} fontSize={12} fontWeight={500} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  formatter={(value, name) => [`${Number(value)} trips`, name]}
                  labelStyle={{ fontWeight: 600, color: theme === 'dark' ? '#f9fafb' : '#111827' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tanker_trips" 
                  stroke="var(--color-warning)" 
                  strokeWidth={4}
                  dot={{ fill: 'var(--color-warning)', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: 'var(--color-warning)', strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Daily Operations Log</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Detailed daily STP operation records</p>
            </div>
            <CustomMonthDropdown 
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              availableMonths={availableMonths}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableHead className="dark:text-white font-semibold">Date</TableHead>
                  <TableHead className="dark:text-white font-semibold">Inlet (m³)</TableHead>
                  <TableHead className="dark:text-white font-semibold">TSE Output (m³)</TableHead>
                  <TableHead className="dark:text-white font-semibold">Efficiency %</TableHead>
                  <TableHead className="dark:text-white font-semibold">Tanker Trips</TableHead>
                  <TableHead className="dark:text-white font-semibold">Income (OMR)</TableHead>
                  <TableHead className="dark:text-white font-semibold">Savings (OMR)</TableHead>
                  <TableHead className="dark:text-white font-semibold">Total Impact (OMR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyOperations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="8" className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No operations data available for {availableMonths.find(m => m.key === selectedMonth)?.label || selectedMonth}
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyOperations.map((op) => {
                    const efficiency = op.inlet_sewage > 0 ? ((op.tse_for_irrigation / op.inlet_sewage) * 100).toFixed(1) : 0;
                    return (
                      <TableRow key={op.id} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                        <TableCell className="font-medium">{format(new Date(op.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{(op.inlet_sewage || 0).toLocaleString()}</TableCell>
                        <TableCell>{(op.tse_for_irrigation || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            efficiency >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            efficiency >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {efficiency}%
                          </span>
                        </TableCell>
                        <TableCell>{op.tanker_trips}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400 font-medium">{(op.generated_income || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-blue-600 dark:text-blue-400 font-medium">{(op.water_savings || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-purple-600 dark:text-purple-400 font-bold">{(op.total_impact || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}