import React, { useState, useEffect, useCallback, useMemo } from "react";
import { WaterMeter } from "@/lib/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, BarChart, Bar, CartesianGrid, Cell } from "recharts";
import { BarChart3, TrendingUp, TestTube2, Database, Droplets, ArrowRightLeft, ChevronsRight, Users, Minus, AlertTriangle, ChevronDown, ChevronRight, ListTree, Layers, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

import TabNavigation from "@/components/TabNavigation";
import FilterTabs from "@/components/FilterTabs";
import ZoneAnalysis from "@/components/ZoneAnalysis";
import StatsGrid from "@/components/StatsGrid";
import WaterSystemToggle from "@/components/WaterSystemToggle";

// Import Daily Analysis components
import FilterControls from "@/components/FilterControls";
import ConsumptionGauges from "@/components/ConsumptionGauges";
import ConsumptionTrendChart from "@/components/ConsumptionTrendChart";
import KpiCards from "@/components/KpiCards";
import AnomalyReport from "@/components/AnomalyReport";
import ConsumptionTable from "@/components/ConsumptionTable";

export default function WaterManagementDashboard() {
  // Monthly dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [meters, setMeters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [startDate, setStartDate] = useState('2025-01');
  const [endDate, setEndDate] = useState('2025-08');
  const [isAnimating, setIsAnimating] = useState(false);
  const [avaluesFilter, setAvaluesFilter] = useState("avalues_all");
  const [lossFilter, setLossFilter] = useState("loss_all");
  const [sliderRange, setSliderRange] = useState([1, 8]);
  const [filterType, setFilterType] = useState('all');
  const [databaseSearch, setDatabaseSearch] = useState('');
  const [databaseLevelFilter, setDatabaseLevelFilter] = useState('all');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [hierarchyLevelFilter, setHierarchyLevelFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState(['root']);

  // Enhanced state for new backend integration
  const [aValues, setAValues] = useState(null);
  const [zonePerformance, setZonePerformance] = useState([]);
  const [buildingAnalysis, setBuildingAnalysis] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  // Daily analysis state
  const [dailyRecords, setDailyRecords] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);
  const [dateRange, setDateRange] = useState([1, 30]);
  const [processedData, setProcessedData] = useState([]);
  const [availableDates, setAvailableDates] = useState({ min: 1, max: 30, month: 'Jun', year: '2025' });
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [dailyDataError, setDailyDataError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Toggle state with persistence
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('waterSystemView') || 'monthly';
  });

  // Persist view selection
  useEffect(() => {
    localStorage.setItem('waterSystemView', activeView);
  }, [activeView]);

  // Month mapping for slider
  const monthMapping = useMemo(() => [
    { value: 1, label: 'Jan-25', key: '2025-01' },
    { value: 2, label: 'Feb-25', key: '2025-02' },
    { value: 3, label: 'Mar-25', key: '2025-03' },
    { value: 4, label: 'Apr-25', key: '2025-04' },
    { value: 5, label: 'May-25', key: '2025-05' },
    { value: 6, label: 'Jun-25', key: '2025-06' },
    { value: 7, label: 'Jul-25', key: '2025-07' },
    { value: 8, label: 'Aug-25', key: '2025-08' }
  ], []);

  // Enhanced loadWaterData using new backend functions
  const loadWaterData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load meters data
      const waterMeters = await WaterMeter.list();
      setMeters(waterMeters);

      // Load A-values for current month (July 2025)
      const aValuesData = await WaterMeter.getAValues(2025, 7);
      setAValues(aValuesData);

      // Load zone performance
      const zoneData = await WaterMeter.getZonePerformance(2025, 7);
      setZonePerformance(zoneData);

      // Load building analysis
      const buildingData = await WaterMeter.getBuildingAnalysis(2025, 7);
      setBuildingAnalysis(buildingData);

      // Load monthly trends
      const trendsData = await WaterMeter.getMonthlyTrends(2025, 1, 2025, 9);
      setMonthlyTrends(trendsData);

      // Calculate analytics for the selected date range
      calculateAnalytics(startDate, endDate);
    } catch (error) {
      console.error("Error loading water data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  // Calculate analytics from the new backend data
  const calculateAnalytics = useCallback((dateStart, dateEnd) => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    const months = getMonthsInRange(dateStart, dateEnd);
    const filteredTrends = monthlyTrends.filter((trend) =>
      months.includes(trend.month_label)
    );

    // Calculate totals from filtered trends
    const totals = filteredTrends.reduce((acc, trend) => {
      acc.A1 += trend.a1_total || 0;
      acc.A2 += trend.a2_total || 0;
      acc.A3_Individual += trend.a3_individual_total || 0;
      acc.A3_Bulk += trend.a3_bulk_total || 0;
      acc.stage1Loss += trend.stage1_loss || 0;
      acc.stage2Loss += trend.stage2_loss || 0;
      acc.totalLoss += trend.total_loss || 0;
      return acc;
    }, { A1: 0, A2: 0, A3_Individual: 0, A3_Bulk: 0, stage1Loss: 0, stage2Loss: 0, totalLoss: 0 });

    const efficiency = totals.A1 > 0 ? (totals.A3_Individual / totals.A1 * 100).toFixed(1) : "0.0";

    setAnalytics({
      totals: {
        ...totals,
        efficiency
      },
      losses: {
        stage1: totals.stage1Loss,
        stage2: totals.stage2Loss,
        total: totals.totalLoss
      },
      monthlyTrends: filteredTrends
    });
  }, [monthlyTrends]);

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

  // Enhanced loadDailyData
  const loadDailyData = useCallback(async () => {
    setIsLoading(true);
    setDailyDataError(null);

    try {
      const data = await DailyWaterReading.list();
      const safeData = Array.isArray(data) ? data : [];
      
      setDailyRecords(safeData);
      setDailyDataError(null);
      setRetryCount(0);

      if (safeData.length > 0) {
        // Process daily data
        const validRecords = safeData.filter(r => r && r.date && typeof r.date === 'string');
        const monthSet = new Set();
        
        validRecords.forEach(r => {
          const monthKey = r.date.slice(0, 7);
          if (monthKey && monthKey.length === 7) {
            monthSet.add(monthKey);
          }
        });

        const months = Array.from(monthSet).sort();
        const monthsLabeled = months.map(m => {
          try {
            const d = new Date(`${m}-01T00:00:00`);
            return { 
              key: m, 
              label: `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}` 
            };
          } catch (e) {
            return { key: m, label: m };
          }
        }).filter(Boolean);

        setAvailableMonths(monthsLabeled);
        const defaultMonth = months.length > 0 ? months[months.length - 1] : null;
        setSelectedMonthKey(defaultMonth);

        if (defaultMonth) {
          const monthRecords = validRecords.filter(r => r.date && r.date.startsWith(defaultMonth));
          if (monthRecords.length > 0) {
            const days = monthRecords.map(r => r.day).filter(day => typeof day === 'number');
            if (days.length > 0) {
              const minDay = Math.min(...days);
              const maxDay = Math.max(...days);
              
              try {
                const d = new Date(`${defaultMonth}-01T00:00:00`);
                const month = d.toLocaleDateString('en-US', { month: 'short' });
                const year = `${d.getFullYear()}`;
                
                setAvailableDates({ min: minDay, max: maxDay, month, year });
                setDateRange([minDay, maxDay]);
              } catch (e) {
                setAvailableDates({ min: 1, max: 30, month: '', year: '' });
                setDateRange([1, 30]);
              }

              const zones = monthRecords
                .map(r => r.zone)
                .filter(zone => zone && typeof zone === 'string')
                .filter((zone, index, arr) => arr.indexOf(zone) === index)
                .sort();

              if (zones.length > 0) {
                setSelectedZones([zones[0]]);
              } else {
                setSelectedZones([]);
              }
            } else {
                setSelectedZones([]);
            }
          } else {
            setSelectedZones([]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading daily water data:", error);
      setDailyDataError("Failed to load daily water data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDateChange = useCallback((newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Update slider to match date selection
    const startMonth = monthMapping.find((m) => m.key === newStartDate);
    const endMonth = monthMapping.find((m) => m.key === newEndDate);
    if (startMonth && endMonth) {
      setSliderRange([startMonth.value, endMonth.value]);
    }

    calculateAnalytics(newStartDate, newEndDate);
  }, [calculateAnalytics, monthMapping]);

  const handleSliderChange = useCallback((newRange) => {
    setSliderRange(newRange);

    // Convert slider values to date keys
    const startMonth = monthMapping.find((m) => m.value === newRange[0]);
    const endMonth = monthMapping.find((m) => m.value === newRange[1]);

    if (startMonth && endMonth) {
      setStartDate(startMonth.key);
      setEndDate(endMonth.key);
      calculateAnalytics(startMonth.key, endMonth.key);
    }
  }, [calculateAnalytics, monthMapping]);

  const handleReset = useCallback(() => {
    const defaultStart = '2025-01';
    const defaultEnd = '2025-08';
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSliderRange([1, 8]);
    calculateAnalytics(defaultStart, defaultEnd);
  }, [calculateAnalytics]);

  // Load data based on active view
  useEffect(() => {
    if (activeView === 'monthly') {
      loadWaterData();
    } else if (activeView === 'daily') {
      loadDailyData();
    }
  }, [loadWaterData, loadDailyData, activeView]);

  // Process daily data
  useEffect(() => {
    if (activeView === 'daily' && Array.isArray(dailyRecords) && dailyRecords.length > 0 && selectedMonthKey) {
      const monthRecords = dailyRecords.filter(r => r && r.date && r.date.startsWith(selectedMonthKey));
      
      const processData = () => {
        if (!Array.isArray(dateRange) || dateRange.length !== 2) {
          return [];
        }

        const days = Array.from({ length: dateRange[1] - dateRange[0] + 1 }, 
          (_, i) => dateRange[0] + i);

        return days.map(day => {
          let totalBulk = 0;
          let totalIndividual = 0;
          let totalLoss = 0;

          const safeSelectedZones = Array.isArray(selectedZones) ? selectedZones : [];
          safeSelectedZones.forEach(zone => {
            const dayRecord = monthRecords.find(r => r && r.zone === zone && r.day === day);
            if (dayRecord) {
              totalBulk += Number(dayRecord.l2_total_m3) || 0;
              totalIndividual += Number(dayRecord.l3_total_m3) || 0;
              totalLoss += Number(dayRecord.loss_m3) || 0;
            }
          });

          const lossPercent = totalBulk > 0 ? (totalLoss / totalBulk * 100) : 0;

          return {
            day,
            date: `${availableDates.month || ''} ${day}, ${availableDates.year || ''}`,
            bulk: totalBulk,
            individual: totalIndividual,
            loss: totalLoss,
            lossPercent: parseFloat(lossPercent.toFixed(1)),
            status: totalLoss < 0 ? 'Gain' : 'Loss'
          };
        }).filter(d => d.bulk > 0 || d.individual > 0 || d.loss !== 0);
      };

      try {
        setProcessedData(processData());
      } catch (e) {
        console.error("Error processing daily data:", e);
        setProcessedData([]);
      }
    } else if (activeView === 'daily' && (!dailyRecords.length || !selectedMonthKey)) {
        setProcessedData([]);
    }
  }, [dailyRecords, selectedZones, dateRange, availableDates, selectedMonthKey, activeView]);

  // Get available zones for daily analysis
  const availableZones = React.useMemo(() => {
    if (activeView !== 'daily' || !selectedMonthKey || !Array.isArray(dailyRecords)) return [];
    const monthRecords = dailyRecords.filter(r => r && r.date && r.date.startsWith(selectedMonthKey));
    return monthRecords
      .map(r => r.zone)
      .filter(zone => zone && typeof zone === 'string')
      .filter((zone, index, arr) => arr.indexOf(zone) === index)
      .sort();
  }, [dailyRecords, selectedMonthKey, activeView]);

  const rangeLabel = useMemo(() => {
    const formatMonth = (ym) => {
      if (!ym) return '';
      const [year, month] = ym.split('-');
      if (!year || !month) return ym;
      try {
        const d = new Date(`${year}-${month}-01T00:00:00`);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } catch (error) {
        console.warn('Failed to format range month', ym, error);
        return ym;
      }
    };
    return `${formatMonth(startDate)} - ${formatMonth(endDate)}`;
  }, [startDate, endDate]);

  // Enhanced KPI stats using new backend data
  const getWaterKPIStats = useCallback(() => {
    if (!aValues) return [];

    return [
      { 
        label: 'A1 - MAIN SOURCE', 
        value: `${(aValues.a1_total / 1000).toFixed(1)}k m³`,
        subtitle: `${aValues.a1_total.toLocaleString()} m³ total input`,
        icon: Droplets 
      },
      { 
        label: 'A2 - ZONE DISTRIBUTION', 
        value: `${(aValues.a2_total / 1000).toFixed(1)}k m³`,
        subtitle: 'L2 Zone Bulks + Direct Connections',
        icon: ChevronsRight 
      },
      { 
        label: 'A3 - INDIVIDUAL', 
        value: `${(aValues.a3_individual_total / 1000).toFixed(1)}k m³`,
        subtitle: 'L3 Villas + L4 Apartments + DC',
        icon: Users 
      },
      { 
        label: 'SYSTEM EFFICIENCY', 
        value: `${aValues.efficiency_percent}%`,
        subtitle: 'Target: 85% minimum',
        icon: ArrowRightLeft 
      },
      { 
        label: 'STAGE 1 LOSS', 
        value: `${Math.abs(aValues.stage1_loss).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${aValues.a1_total > 0 ? Math.abs(aValues.stage1_loss / aValues.a1_total * 100).toFixed(1) : 0}%`,
        icon: Minus 
      },
      { 
        label: 'STAGE 2 LOSS', 
        value: `${Math.abs(aValues.stage2_loss).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${aValues.a2_total > 0 ? Math.abs(aValues.stage2_loss / aValues.a2_total * 100).toFixed(1) : 0}%`,
        icon: Minus 
      },
      { 
        label: 'TOTAL SYSTEM LOSS', 
        value: `${Math.abs(aValues.total_loss).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${aValues.a1_total > 0 ? Math.abs(aValues.total_loss / aValues.a1_total * 100).toFixed(1) : 0}%`,
        icon: AlertTriangle 
      },
      { 
        label: 'A3 - BULK LEVEL', 
        value: `${(aValues.a3_bulk_total / 1000).toFixed(1)}k m³`,
        subtitle: 'All L3 meters + Direct Connections',
        icon: ChevronsRight 
      }
    ];
  }, [aValues]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'performance', label: 'Performance KPIs', icon: TrendingUp },
    { key: 'zone', label: 'Zone Analysis', icon: TestTube2 },
    { key: 'building', label: 'Building Analysis', icon: Layers },
    { key: 'consumption', label: 'Consumption by Type', icon: BarChart3 },
    { key: 'database', label: 'Main Database', icon: Database }
  ];

  const renderOverview = () => {
    if (!analytics) return null;
    const { monthlyTrends } = analytics;

    const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      color: theme === 'dark' ? '#ffffff' : '#000000',
      borderRadius: '12px'
    };

    const showA1 = avaluesFilter === "avalues_all" || avaluesFilter === "a1_only";
    const showA2 = avaluesFilter === "avalues_all" || avaluesFilter === "a2_only";
    const showA3 = avaluesFilter === "avalues_all" || avaluesFilter === "a3_only";

    const showLossTotal = lossFilter === "loss_all" || lossFilter === "loss_total";
    const showLossStage1 = lossFilter === "loss_all" || lossFilter === "loss_stages";
    const showLossStage2 = lossFilter === "loss_all" || lossFilter === "loss_stages";

    return (
      <div className="space-y-6">
        <StatsGrid stats={getWaterKPIStats()} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-900 mb-4 text-base font-semibold leading-none tracking-tight dark:text-white">Water System A-Values Distribution</CardTitle>
              <FilterTabs
                label="A-Values View"
                options={[
                  { value: "avalues_all", label: "All" },
                  { value: "a1_only", label: "A1 Only" },
                  { value: "a2_only", label: "A2 Only" },
                  { value: "a3_only", label: "A3 Individual" }
                ]}
                value={avaluesFilter}
                onChange={setAvaluesFilter}
              />
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradA1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradA2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradA3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month_label" stroke={chartStrokeColor} />
                    <YAxis stroke={chartStrokeColor} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                      formatter={(v) => [`${Number(v).toLocaleString()} m³`]}
                      labelFormatter={(month) => `${month}`}
                    />
                    <Legend />
                    {showA1 &&
                      <Area
                        type="monotone"
                        name="A1 - Main Source"
                        dataKey="a1_total"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fill="url(#gradA1)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                    {showA2 &&
                      <Area
                        type="monotone"
                        name="A2 - Zone Distribution"
                        dataKey="a2_total"
                        stroke="#2563EB"
                        strokeWidth={3}
                        fill="url(#gradA2)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                    {showA3 &&
                      <Area
                        type="monotone"
                        name="A3 - Individual"
                        dataKey="a3_individual_total"
                        stroke="#60A5FA"
                        strokeWidth={3}
                        fill="url(#gradA3)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-900 mb-4 text-sm font-semibold leading-none tracking-tight dark:text-white">Water Loss Analysis</CardTitle>
              <FilterTabs
                label="Loss Trend View"
                options={[
                  { value: "loss_all", label: "All Stages" },
                  { value: "loss_total", label: "Total Only" },
                  { value: "loss_stages", label: "Stage 1 & 2" }
                ]}
                value={lossFilter}
                onChange={setLossFilter}
              />
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradLossTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradLossStage1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradLossStage2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month_label" stroke={chartStrokeColor} />
                    <YAxis stroke={chartStrokeColor} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(v) => [`${Number(v).toLocaleString()} m³`]}
                      labelFormatter={(month) => `${month}`}
                    />
                    <Legend />
                    {showLossTotal &&
                      <Area
                        type="monotone"
                        name="Total Loss"
                        dataKey="total_loss"
                        stroke="#EF4444"
                        strokeWidth={3}
                        fill="url(#gradLossTotal)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                    {showLossStage1 &&
                      <Area
                        type="monotone"
                        name="Stage 1 Loss"
                        dataKey="stage1_loss"
                        stroke="#DC2626"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#gradLossStage1)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                    {showLossStage2 &&
                      <Area
                        type="monotone"
                        name="Stage 2 Loss"
                        dataKey="stage2_loss"
                        stroke="#F87171"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#gradLossStage2)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                      />
                    }
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderZoneAnalysis = () => {
    const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      color: theme === 'dark' ? '#ffffff' : '#000000',
      borderRadius: '12px'
    };

    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Zone Performance Analysis</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Zone-level consumption and loss analysis from Supabase backend</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zonePerformance}>
                  <XAxis dataKey="zone_name" stroke={chartStrokeColor} />
                  <YAxis stroke={chartStrokeColor} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="zone_bulk_input" name="Zone Bulk Input" fill="#3b82f6" />
                  <Bar dataKey="total_l3_consumption" name="L3 Consumption" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Zone Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableHead className="text-gray-900 dark:text-white">Zone Name</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Bulk Input (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">L3 Consumption (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Loss Volume (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Loss %</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zonePerformance.map((zone) => (
                  <TableRow key={zone.zone_name} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium">{zone.zone_name}</TableCell>
                    <TableCell>{zone.zone_bulk_input.toLocaleString()}</TableCell>
                    <TableCell>{zone.total_l3_consumption.toLocaleString()}</TableCell>
                    <TableCell>{zone.loss_volume.toLocaleString()}</TableCell>
                    <TableCell>{zone.loss_percent.toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        zone.status === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300' :
                        zone.status === 'Warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300' :
                        zone.status === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-300'
                      }`}>
                        {zone.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBuildingAnalysis = () => {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Building Internal Loss Analysis</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Stage 3 focus - Building-level internal loss analysis</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableHead className="text-gray-900 dark:text-white">Building Name</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Zone</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Building Bulk (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Total L4 (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Internal Loss (m³)</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Internal Loss %</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildingAnalysis.map((building) => (
                  <TableRow key={building.building_name} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium">{building.building_name}</TableCell>
                    <TableCell>{building.zone_name}</TableCell>
                    <TableCell>{building.building_bulk.toLocaleString()}</TableCell>
                    <TableCell>{building.total_l4.toLocaleString()}</TableCell>
                    <TableCell>{building.internal_loss.toLocaleString()}</TableCell>
                    <TableCell>{building.internal_loss_percent.toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        building.status === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300' :
                        building.status === 'Warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300' :
                        building.status === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-300'
                      }`}>
                        {building.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDailyAnalysis = () => {
    const getDynamicTitle = () => {
      const safeSelectedZones = Array.isArray(selectedZones) ? selectedZones : [];
      if (safeSelectedZones.length === 1) {
        return `${(safeSelectedZones[0] || 'Unknown Zone').replace(/_/g, " ")} Analysis`;
      } else if (safeSelectedZones.length > 1) {
        return "Zone Comparison";
      }
      return "Daily Water Analysis";
    };

    const getSubtitle = () => {
      if (!availableDates.month || !availableDates.year) {
        return "Select a month to view data.";
      }
      const safeRange = Array.isArray(dateRange) && dateRange.length === 2 ? dateRange : [1, 30];
      return `Showing data from ${availableDates.month} ${safeRange[0]}, ${availableDates.year} to ${availableDates.month} ${safeRange[1]}, ${availableDates.year}`;
    };

    if (isLoading) {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white">Loading daily water data...</p>
          </CardContent>
        </Card>
      );
    }

    if (dailyDataError) {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white mb-4">{dailyDataError}</p>
            <Button 
              onClick={() => loadDailyData()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Retry Loading Data
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!Array.isArray(dailyRecords) || dailyRecords.length === 0) {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
          <CardContent className="p-8 text-center">
            <p className="text-gray-900 dark:text-white">No daily water data available.</p>
            <Button 
              onClick={() => loadDailyData()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <FilterControls
          selectedZones={selectedZones || []}
          onZonesChange={setSelectedZones}
          availableZones={availableZones || []}
          dateRange={dateRange || [1, 30]}
          onDateRangeChange={setDateRange}
          onReset={() => {
            const monthRecordsForReset = Array.isArray(dailyRecords) ? dailyRecords.filter(r => r && r.date && r.date.startsWith(selectedMonthKey || '')) : [];
            const zonesForReset = monthRecordsForReset
              .map(r => r.zone)
              .filter(zone => zone && typeof zone === 'string')
              .filter((zone, index, arr) => arr.indexOf(zone) === index)
              .sort();
            setSelectedZones(zonesForReset.length > 0 ? [zonesForReset[0]] : []);
            setDateRange([availableDates.min || 1, availableDates.max || 30]);
          }}
          maxDays={availableDates.max || 30}
          minDay={availableDates.min || 1}
          availableDates={availableDates}
          availableMonths={availableMonths || []}
          selectedMonthKey={selectedMonthKey}
          onMonthChange={setSelectedMonthKey}
        />

        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getDynamicTitle()}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {getSubtitle()}
          </p>
        </div>

        <ConsumptionGauges data={Array.isArray(processedData) ? processedData : []} theme={theme} />

        <ConsumptionTrendChart 
          data={Array.isArray(processedData) ? processedData : []}
          selectedZones={Array.isArray(selectedZones) ? selectedZones : []}
          records={Array.isArray(dailyRecords) ? dailyRecords.filter(r => r && r.date && r.date.startsWith(selectedMonthKey || '')) : []}
          dateRange={Array.isArray(dateRange) && dateRange.length === 2 ? dateRange : [1, 30]}
          theme={theme}
        />

        <KpiCards data={Array.isArray(processedData) ? processedData : []} theme={theme} />

        {Array.isArray(selectedZones) && selectedZones.length === 1 && (
          <AnomalyReport data={Array.isArray(processedData) ? processedData : []} zoneName={selectedZones[0] || ''} theme={theme} />
        )}

        {Array.isArray(selectedZones) && selectedZones.length === 1 && (
          <ConsumptionTable data={Array.isArray(processedData) ? processedData : []} theme={theme} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <WaterSystemToggle 
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {activeView === 'daily' ? (
        renderDailyAnalysis()
      ) : (
        <>
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {(activeTab === 'overview' || activeTab === 'performance' || activeTab === 'consumption') && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="month"
                    value={startDate}
                    onChange={(e) => handleDateChange(e.target.value, endDate)}
                    className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <Input
                    type="month"
                    value={endDate}
                    onChange={(e) => handleDateChange(startDate, e.target.value)}
                    className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <Button
                  onClick={handleReset}
                  className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
                >
                  Reset Range
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-900 dark:text-white">Loading water data...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'performance' && <StatsGrid stats={getWaterKPIStats()} />}
              {activeTab === 'zone' && renderZoneAnalysis()}
              {activeTab === 'building' && renderBuildingAnalysis()}
              {activeTab === 'consumption' && <div>Consumption by Type - Coming Soon</div>}
              {activeTab === 'database' && <div>Main Database - Coming Soon</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
