
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WaterMeter } from "@/lib/entities";
import { DailyWaterReading } from "@/lib/entities";
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

// Cache expiration time (5 minutes) - moved outside component to avoid dependency issues
const CACHE_DURATION = 5 * 60 * 1000;

// Utility function for exponential backoff - moved outside component to be a stable reference
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function Water() {
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
  const [filterType, setFilterType] = useState('all'); // NEW: type filter for Consumption by Type
  const [databaseSearch, setDatabaseSearch] = useState('');
  const [databaseLevelFilter, setDatabaseLevelFilter] = useState('all');
  const [hierarchySearch, setHierarchySearch] = useState('');
  const [hierarchyLevelFilter, setHierarchyLevelFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState(['root']);

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

  // Ref to cache fetched data to avoid repeated API calls
  const metersCache = useRef(null);
  const dailyDataCache = useRef(null);
  const dailyDataCacheTime = useRef(null);
  const loadingDaily = useRef(false);

  // Month mapping for slider, memoized for stable reference
  const monthMapping = useMemo(() => [
    { value: 1, label: 'Jan-25', key: '2025-01' },
    { value: 2, label: 'Feb-25', key: '2025-02' },
    { value: 3, label: 'Mar-25', key: '2025-03' },
    { value: 4, label: 'Apr-25', key: '2025-04' },
    { value: 5, label: 'May-25', key: '2025-05' },
    { value: 6, label: 'Jun-25', key: '2025-06' },
    { value: 7, label: 'Jul-25', key: '2025-07' },
    { value: 8, label: 'Aug-25', key: '2025-08' }],
    []
  );

  // Real water system data from tables, memoized for stable reference
  const WATER_SYSTEM_DATA = useMemo(() => ({
    monthlyTrends: [
      {
        month: "Jan-25",
        A1: 32580, A2: 34677, A3Ind: 27225, A3Bulk: 27076,
        stage1Vol: -2097, stage2Vol: 7452, totalLossVol: 5355,
        loss1: -6.4, loss2: 21.5, efficiency: 83.6
      },
      {
        month: "Feb-25",
        A1: 44043, A2: 35246, A3Ind: 27781, A3Bulk: 27637,
        stage1Vol: 8797, stage2Vol: 7465, totalLossVol: 16262,
        loss1: 20.0, loss2: 21.2, efficiency: 63.1
      },
      {
        month: "Mar-25",
        A1: 34915, A2: 38982, A3Ind: 31647, A3Bulk: 32413,
        stage1Vol: -4067, stage2Vol: 7335, totalLossVol: 3268,
        loss1: -11.6, loss2: 18.8, efficiency: 90.6
      },
      {
        month: "Apr-25",
        A1: 46039, A2: 45237, A3Ind: 38285, A3Bulk: 38191,
        stage1Vol: 802, stage2Vol: 6952, totalLossVol: 7754,
        loss1: 1.7, loss2: 15.4, efficiency: 83.2
      },
      {
        month: "May-25",
        A1: 58425, A2: 46354, A3Ind: 41852, A3Bulk: 41932,
        stage1Vol: 12071, stage2Vol: 4502, totalLossVol: 16573,
        loss1: 20.7, loss2: 9.7, efficiency: 71.6
      },
      {
        month: "Jun-25",
        A1: 41840, A2: 40010, A3Ind: 28713, A3Bulk: 28763,
        stage1Vol: 1830, stage2Vol: 11297, totalLossVol: 13127,
        loss1: 4.4, loss2: 28.2, efficiency: 68.6
      },
      {
        month: "Jul-25",
        A1: 41475, A2: 37154, A3Ind: 31235, A3Bulk: 27503,
        stage1Vol: 4321, stage2Vol: 5919, totalLossVol: 10240,
        loss1: 10.4, loss2: 15.9, efficiency: 75.3
      },
      {
        month: "Aug-25",
        A1: 41743, A2: 38843, A3Ind: 31654, A3Bulk: 28123,
        stage1Vol: 2900, stage2Vol: 7189, totalLossVol: 10089,
        loss1: 6.9, loss2: 18.5, efficiency: 75.8
      }],

    zonePerformance: [
      { zone: "Zone_08", average: 2789, status: "Active", Jul25: 3542, Aug25: 3840 },
      { zone: "Zone_03_(A)", average: 4970, status: "Active", Jul25: 6026, Aug25: 6212 },
      { zone: "Zone_03_(B)", average: 3020, status: "Active", Jul25: 3243, Aug25: 2886 },
      { zone: "Zone_05", average: 3941, status: "Active", Jul25: 3497, Aug25: 3968 },
      { zone: "Zone_01_(FM)", average: 1892, status: "Active", Jul25: 1974, Aug25: 2305 },
      { zone: "Zone_VS", average: 30, status: "Low", Jul25: 60, Aug25: 77 },
      { zone: "Zone_SC", average: 61, status: "Critical", Jul25: 60, Aug25: 61 }],

    consumptionByType: [
      { type: "Commercial (Retail)", total: 173673, percentage: 52.4, color: "#3b82f6" },
      { type: "Zone Infrastructure", total: 134506, percentage: 40.6, color: "#10b981" },
      { type: "Residential (Villas)", total: 92871, percentage: 28.0, color: "#f59e0b" },
      { type: "Irrigation", total: 6149, percentage: 1.9, color: "#06b6d4" },
      { type: "Common Areas", total: 314, percentage: 0.1, color: "#8b5cf6" }]
  }), []);

  // Use WATER_SYSTEM_DATA monthlyTrends directly to avoid hook dependency warning
  const monthlyTrends = WATER_SYSTEM_DATA.monthlyTrends;

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
  }, []); // Dependencies are empty as it only uses parameters and local variables

  // Sum readings for WaterMeters in the selected range using reading keys like 'Jul-25'
  const sumWaterMeterInRange = useCallback((meter) => {
    const months = getMonthsInRange(startDate, endDate); // returns labels like 'Jan-25'
    return months.reduce((acc, m) => acc + Number(meter.readings?.[m] || 0), 0);
  }, [getMonthsInRange, startDate, endDate]); // getMonthsInRange is stable due to useCallback([])

  // Build "consumption by type" from WaterMeter.meter_type
  const getWaterConsumptionByType = useCallback(() => {
    if (!meters || meters.length === 0) return [];
    const grouped = meters.reduce((acc, meter) => {
      const type = meter.meter_type || 'Unknown';
      const c = sumWaterMeterInRange(meter);
      if (!acc[type]) acc[type] = { type, consumption: 0, count: 0 };
      acc[type].consumption += c;
      acc[type].count += 1;
      return acc;
    }, {});
    const total = Object.values(grouped).reduce((s, g) => s + g.consumption, 0);
    const colors = ['#00D2B3', '#A2D0C8', '#81D8D0', '#4E4456', '#FFD166', '#FF6B6B', '#8B5CF6', '#10B981'];
    return Object.values(grouped).map((g, i) => ({
      ...g,
      percentage: total > 0 ? Math.round((g.consumption / total) * 100) : 0,
      color: colors[i % colors.length]
    })).sort((a, b) => b.consumption - a.consumption);
  }, [meters, sumWaterMeterInRange]);

  // Stats similar to Electricity › Analysis by Type
  const getWaterStatsFromMeters = useCallback((subset) => {
    const list = subset || meters;
    const totalConsumption = list.reduce((sum, m) => sum + sumWaterMeterInRange(m), 0);
    const highest = list.reduce((max, m) => {
      const c = sumWaterMeterInRange(m);
      return c > max.c ? { m, c } : max;
    }, { m: null, c: 0 });

    return [
      { label: 'TOTAL CONSUMPTION', value: `${Math.round(totalConsumption).toLocaleString()} m³`, subtitle: 'Selected range', icon: Droplets },
      { label: 'METER COUNT', value: list.length.toString(), subtitle: `Type: ${filterType.replace(/_/g, ' ')}`, icon: Users },
      { label: 'HIGHEST CONSUMER', value: highest.m?.meter_label || 'N/A', subtitle: `${Math.round(highest.c).toLocaleString()} m³`, icon: TrendingUp },
      { label: 'ACTIVE TYPES', value: [...new Set(list.map(m => m.meter_type || 'Unknown'))].length.toString(), subtitle: 'Across selected range', icon: Database }
    ];
  }, [meters, sumWaterMeterInRange, filterType]);

  const calculateAnalytics = useCallback((dateStart, dateEnd) => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    const months = getMonthsInRange(dateStart, dateEnd);
    const filteredTrends = monthlyTrends.filter((trend) =>
      months.includes(trend.month)
    );

    // Calculate totals from filtered trends
    const totals = filteredTrends.reduce((acc, trend) => {
      acc.A1 += trend.A1;
      acc.A2 += trend.A2;
      acc.A3_Individual += trend.A3Ind;
      acc.A3_Bulk += trend.A3Bulk;
      acc.stage1Loss += trend.stage1Vol;
      acc.stage2Loss += trend.stage2Vol;
      acc.totalLoss += trend.totalLossVol;
      return acc;
    }, { A1: 0, A2: 0, A3_Individual: 0, A3_Bulk: 0, stage1Loss: 0, stage2Loss: 0, totalLoss: 0 });

    const efficiency = totals.A1 > 0 ? (totals.A3_Individual / totals.A1 * 100).toFixed(1) : "0.0";

    setAnalytics({
      totals: {
        ...totals,
        efficiency
      },
      losses: {
        stage1: totals.stage1Loss, // Fixed: use totals.stage1Loss instead of losses.stage1
        stage2: totals.stage2Loss, // Fixed: use totals.stage2Loss instead of losses.stage2  
        total: totals.totalLoss    // Fixed: use totals.totalLoss instead of losses.total
      },
      monthlyTrends: filteredTrends
    });
  }, [getMonthsInRange, monthlyTrends]); // Removed setAnalytics, setIsAnimating from dependencies as state setters are stable.

  // Enhanced loadDailyData with rate limiting, caching, and retry logic
  const loadDailyData = useCallback(async (forceRefresh = false) => {
    // Prevent multiple concurrent calls
    if (loadingDaily.current && !forceRefresh) {
      return;
    }

    // Check cache first
    const now = Date.now();
    if (!forceRefresh && dailyDataCache.current && dailyDataCacheTime.current &&
        (now - dailyDataCacheTime.current) < CACHE_DURATION) {
      console.log("Using cached daily water data");
      setDailyRecords(dailyDataCache.current);
      setIsLoading(false);
      return;
    }

    loadingDaily.current = true;
    setIsLoading(true);
    setDailyDataError(null);

    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry <= maxRetries) {
      try {
        const data = await DailyWaterReading.list();
        const safeData = Array.isArray(data) ? data : [];
        
        // Cache the successful response
        dailyDataCache.current = safeData;
        dailyDataCacheTime.current = now;
        
        setDailyRecords(safeData);
        setDailyDataError(null);
        setRetryCount(0);

        if (safeData.length > 0) {
          // Process daily data similar to WaterDaily page logic
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
        
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Error loading daily water data (attempt ${currentRetry + 1}):`, error);
        
        if (error.response?.status === 429) {
          // Rate limit error - implement exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, currentRetry), 10000);
          console.log(`Rate limited, waiting ${backoffDelay}ms before retry...`);
          
          if (currentRetry < maxRetries) {
            await sleep(backoffDelay);
            currentRetry++;
            setRetryCount(currentRetry);
            continue;
          } else {
            setDailyDataError("Service temporarily unavailable. Please try again later.");
          }
        } else {
          setDailyDataError("Failed to load daily water data. Please try again.");
        }
        
        if (currentRetry >= maxRetries) {
          break;
        }
        currentRetry++;
      }
    }
    
    loadingDaily.current = false;
    setIsLoading(false);
  }, [
      setDailyRecords, setIsLoading, setDailyDataError, setRetryCount, setAvailableMonths,
      setSelectedMonthKey, setAvailableDates, setDateRange, setSelectedZones
  ]); // CACHE_DURATION and sleep are stable outside the component

  // This useCallback now incorporates caching for the WaterMeter.list() API call.
  const loadWaterData = useCallback(async () => {
    setIsLoading(true);
    try {
      let waterMeters;
      if (metersCache.current) {
        waterMeters = metersCache.current; // Use cached data if available
      } else {
        waterMeters = await WaterMeter.list(); // Fetch data from API
        metersCache.current = waterMeters; // Cache the fetched data
      }
      setMeters(waterMeters); // Update meters state for the database view
      calculateAnalytics(startDate, endDate); // Always recalculate analytics for the current date range
    } catch (error) {
      console.error("Error loading water data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateAnalytics, startDate, endDate, setMeters, setIsLoading]);

  const handleDateChange = useCallback((newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Update slider to match date selection
    const startMonth = monthMapping.find((m) => m.key === newStartDate);
    const endMonth = monthMapping.find((m) => m.key === newEndDate);
    if (startMonth && endMonth) {
      setSliderRange([startMonth.value, endMonth.value]);
    }

    calculateAnalytics(newStartDate, newEndDate); // Trigger analytics recalculation
  }, [calculateAnalytics, monthMapping, setStartDate, setEndDate, setSliderRange]);

  const handleSliderChange = useCallback((newRange) => {
    setSliderRange(newRange);

    // Convert slider values to date keys
    const startMonth = monthMapping.find((m) => m.value === newRange[0]);
    const endMonth = monthMapping.find((m) => m.value === newRange[1]);

    if (startMonth && endMonth) {
      setStartDate(startMonth.key);
      setEndDate(endMonth.key);
      calculateAnalytics(startMonth.key, endMonth.key); // Trigger analytics recalculation
    }
  }, [calculateAnalytics, monthMapping, setSliderRange, setStartDate, setEndDate]);

  const handleReset = useCallback(() => {
    const defaultStart = '2025-01';
    const defaultEnd = '2025-08';
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSliderRange([1, 8]); // Reset slider range as well
    calculateAnalytics(defaultStart, defaultEnd); // Trigger analytics recalculation
  }, [calculateAnalytics, setStartDate, setEndDate, setSliderRange]);

  // General effects - optimized to prevent excessive API calls
  useEffect(() => {
    // Theme change listeners
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('storage', handleThemeChange);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          setTheme(newTheme);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Load data based on active view, but only once per view switch
    if (activeView === 'monthly') {
      loadWaterData();
    } else if (activeView === 'daily') {
      // Add a small delay to prevent immediate API calls on rapid view switching
      const timer = setTimeout(() => {
        loadDailyData();
      }, 300);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('storage', handleThemeChange);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      observer.disconnect();
    };
  }, [loadWaterData, loadDailyData, activeView, setTheme]); // Added loadDailyData to dependencies

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
        setProcessedData([]); // Clear data if no records or no month selected
    }
  }, [dailyRecords, selectedZones, dateRange, availableDates, selectedMonthKey, activeView, setProcessedData]);

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

  const databaseOverviewStats = useMemo(() => {
    if (!Array.isArray(meters) || meters.length === 0) return [];

    const totalConsumption = meters.reduce((sum, meter) => sum + sumWaterMeterInRange(meter), 0);
    const meterCount = meters.length;
    const averageConsumption = meterCount > 0 ? totalConsumption / meterCount : 0;
    const mainSourceCount = meters.filter(meter => meter.level === 'L1').length;

    return [
      {
        label: 'TOTAL METERS',
        value: meterCount.toLocaleString(),
        subtitle: 'Tracked across all hierarchy levels',
        icon: Database
      },
      {
        label: 'TOTAL CONSUMPTION',
        value: `${Math.round(totalConsumption).toLocaleString()} m³`,
        subtitle: rangeLabel,
        icon: Droplets
      },
      {
        label: 'AVERAGE PER METER',
        value: `${Math.round(averageConsumption).toLocaleString()} m³`,
        subtitle: 'Selected period average',
        icon: TrendingUp
      },
      {
        label: 'MAIN SOURCE METERS',
        value: mainSourceCount.toString(),
        subtitle: 'Level 1 monitoring points',
        icon: ChevronsRight
      }
    ];
  }, [meters, rangeLabel, sumWaterMeterInRange]);

  const levelBreakdownStats = useMemo(() => {
    if (!Array.isArray(meters) || meters.length === 0) return [];

    const levelOrder = ['L1', 'L2', 'L3', 'L4', 'DC'];
    const metadata = {
      L1: { label: 'L1 • Main Source', icon: Droplets },
      L2: { label: 'L2 • Zone Bulks', icon: ChevronsRight },
      L3: { label: 'L3 • Secondary Distribution', icon: Layers },
      L4: { label: 'L4 • End Users', icon: Users },
      DC: { label: 'Direct Connections', icon: AlertTriangle },
      Unknown: { label: 'Unassigned Level', icon: Database }
    };

    const grouped = meters.reduce((acc, meter) => {
      const level = meter.level || 'Unknown';
      if (!acc[level]) {
        acc[level] = { count: 0, consumption: 0 };
      }
      acc[level].count += 1;
      acc[level].consumption += sumWaterMeterInRange(meter);
      return acc;
    }, {});

    const stats = levelOrder
      .filter(level => grouped[level])
      .map(level => ({
        label: metadata[level].label,
        value: grouped[level].count.toLocaleString(),
        subtitle: `${Math.round(grouped[level].consumption).toLocaleString()} m³`,
        icon: metadata[level].icon
      }));

    if (grouped.Unknown) {
      stats.push({
        label: metadata.Unknown.label,
        value: grouped.Unknown.count.toLocaleString(),
        subtitle: `${Math.round(grouped.Unknown.consumption).toLocaleString()} m³`,
        icon: metadata.Unknown.icon
      });
    }

    return stats;
  }, [meters, sumWaterMeterInRange]);

  const filteredDatabaseMeters = useMemo(() => {
    if (!Array.isArray(meters) || meters.length === 0) return [];
    const query = databaseSearch.trim().toLowerCase();
    const levelFilter = databaseLevelFilter === 'all' ? null : databaseLevelFilter;

    return meters
      .filter(meter => {
        const matchesLevel = !levelFilter || (meter.level || '').toUpperCase() === levelFilter;
        if (!matchesLevel) return false;

        if (!query) return true;

        const haystacks = [
          meter.meter_label,
          meter.account_number,
          meter.zone,
          meter.parent_meter,
          meter.meter_type
        ];

        return haystacks.some(value => typeof value === 'string' && value.toLowerCase().includes(query));
      })
      .map(meter => ({
        ...meter,
        consumption: sumWaterMeterInRange(meter)
      }))
      .sort((a, b) => b.consumption - a.consumption);
  }, [meters, databaseSearch, databaseLevelFilter, sumWaterMeterInRange]);

  const { root: hierarchyRoot, metricsMap: hierarchyMetricsMap } = useMemo(() => {
    if (!Array.isArray(meters) || meters.length === 0) {
      return { root: null, metricsMap: new Map() };
    }

    const nodeMap = new Map();

    meters.forEach((meter) => {
      const id = meter.id || meter.meter_label;
      nodeMap.set(id, {
        id,
        meter,
        label: meter.meter_label,
        level: meter.level || 'Unknown',
        zone: meter.zone,
        type: meter.meter_type,
        parent: null,
        children: []
      });
    });

    const findParent = (parentKey) => {
      if (!parentKey) return null;
      for (const node of nodeMap.values()) {
        if (!node.meter) continue;
        if (node.meter.id === parentKey || node.meter.meter_label === parentKey) {
          return node;
        }
      }
      return null;
    };

    nodeMap.forEach((node) => {
      const parentNode = findParent(node.meter?.parent_meter);
      if (parentNode) {
        node.parent = parentNode;
        parentNode.children.push(node);
      }
    });

    const sortChildren = (node) => {
      if (!node.children) return;
      node.children.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      node.children.forEach(sortChildren);
    };
    nodeMap.forEach(sortChildren);

    const reorganizeNode = (node) => {
      if (!node || !Array.isArray(node.children) || node.level === 'group') {
        node?.children?.forEach(reorganizeNode);
        return;
      }

      node.children.forEach(reorganizeNode);

      const zoneChildren = node.children.filter(child => child.level === 'L2');
      const dcChildren = node.children.filter(child => child.level === 'DC');
      const otherChildren = node.children.filter(child => child.level !== 'L2' && child.level !== 'DC');

      const groupedChildren = [];

      if (zoneChildren.length) {
        groupedChildren.push({
          id: `${node.id}-zone-group`,
          label: 'Zone Bulks',
          level: 'group',
          children: zoneChildren
        });
      }

      if (dcChildren.length) {
        groupedChildren.push({
          id: `${node.id}-dc-group`,
          label: 'Direct Connections',
          level: 'group',
          children: dcChildren
        });
      }

      groupedChildren.push(...otherChildren);

      node.children = groupedChildren;
    };

    const mainNodes = Array.from(nodeMap.values()).filter(node => node.level === 'L1');
    const roots = mainNodes.length > 0
      ? mainNodes
      : Array.from(nodeMap.values()).filter(node => !node.parent);

    roots.forEach(reorganizeNode);

    const root = {
      id: 'root',
      label: 'Muscat Bay Water System',
      level: 'root',
      children: [...roots]
    };

    const zoneNodes = Array.from(nodeMap.values()).filter(node => node.level === 'L2');
    const dcNodes = Array.from(nodeMap.values()).filter(node => node.level === 'DC');

    const orphanZones = zoneNodes.filter(node => !node.parent);
    if (orphanZones.length) {
      root.children.push({
        id: 'root-zone-group',
        label: 'Zone Bulks',
        level: 'group',
        children: orphanZones
      });
    }

    const orphanDC = dcNodes.filter(node => !node.parent);
    if (orphanDC.length) {
      root.children.push({
        id: 'root-dc-group',
        label: 'Direct Connections',
        level: 'group',
        children: orphanDC
      });
    }

    const metricsMap = new Map();

    const computeMetrics = (node) => {
      const childMetrics = (node.children || []).map(computeMetrics);
      const childrenConsumption = childMetrics.reduce((sum, child) => sum + child.totalConsumption, 0);
      const meterConsumption = node.meter ? sumWaterMeterInRange(node.meter) : 0;
      const totalConsumption = node.meter ? meterConsumption : childrenConsumption;
      const hasChildren = childMetrics.length > 0;
      const lossVolume = node.meter
        ? (hasChildren ? meterConsumption - childrenConsumption : 0)
        : childMetrics.reduce((sum, child) => sum + child.lossVolume, 0);
      const meterCount = node.meter ? 1 : childMetrics.reduce((sum, child) => sum + child.meterCount, 0);

      const computedNode = {
        ...node,
        children: childMetrics,
        ownConsumption: meterConsumption,
        totalConsumption,
        lossVolume,
        lossPercent: totalConsumption !== 0 ? Number(((lossVolume / totalConsumption) * 100).toFixed(1)) : 0,
        meterCount,
        status: lossVolume > 0 ? 'Loss' : lossVolume < 0 ? 'Gain' : 'Balanced'
      };

      metricsMap.set(node.id, computedNode);
      return computedNode;
    };

    const computedRoot = computeMetrics(root);

    return { root: computedRoot, metricsMap };
  }, [meters, sumWaterMeterInRange]);

  const hierarchySummaryStats = useMemo(() => {
    if (!hierarchyMetricsMap || hierarchyMetricsMap.size === 0) return [];

    const metricsValues = Array.from(hierarchyMetricsMap.values());
    const levelSum = (level) => metricsValues
      .filter(node => node.level === level)
      .reduce((sum, node) => sum + node.totalConsumption, 0);
    const levelCount = (level) => metricsValues.filter(node => node.level === level).length;

    const mainBulk = levelSum('L1');
    const zoneBulk = levelSum('L2');
    const directConnections = levelSum('DC');
    const mainDistributionLoss = mainBulk - (zoneBulk + directConnections);
    const lossPercent = mainBulk !== 0 ? Math.abs((mainDistributionLoss / mainBulk) * 100) : 0;

    return [
      {
        label: 'MAIN BULK INPUT',
        value: `${Math.round(mainBulk).toLocaleString()} m³`,
        subtitle: `${levelCount('L1')} L1 meter${levelCount('L1') === 1 ? '' : 's'}`,
        icon: Droplets
      },
      {
        label: 'DIRECT CONNECTIONS',
        value: `${Math.round(directConnections).toLocaleString()} m³`,
        subtitle: `${levelCount('DC')} connections`,
        icon: Database
      },
      {
        label: 'ZONE BULKS',
        value: `${Math.round(zoneBulk).toLocaleString()} m³`,
        subtitle: `${levelCount('L2')} active zones`,
        icon: ChevronsRight
      },
      {
        label: 'MAIN DISTRIBUTION LOSS',
        value: `${mainDistributionLoss >= 0 ? '' : '-'}${Math.round(Math.abs(mainDistributionLoss)).toLocaleString()} m³`,
        subtitle: `${lossPercent.toFixed(1)}% ${mainDistributionLoss >= 0 ? 'Loss' : 'Gain'} vs A1`,
        icon: AlertTriangle
      }
    ];
  }, [hierarchyMetricsMap]);

  const hierarchyZoneBarData = useMemo(() => {
    if (!hierarchyMetricsMap || hierarchyMetricsMap.size === 0) return [];

    return Array.from(hierarchyMetricsMap.values())
      .filter(node => node.level === 'L2')
      .map(node => ({
        label: node.label,
        consumption: Math.round(node.totalConsumption),
        loss: Math.round(Math.abs(node.lossVolume))
      }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 10);
  }, [hierarchyMetricsMap]);

  const filteredHierarchy = useMemo(() => {
    if (!hierarchyRoot) return null;

    const query = hierarchySearch.trim().toLowerCase();
    const levelFilter = hierarchyLevelFilter === 'all' ? null : hierarchyLevelFilter;

    const filterNode = (node) => {
      const matchesQuery = !query || [node.label, node.zone, node.type]
        .some(value => typeof value === 'string' && value.toLowerCase().includes(query));
      const matchesLevel = !levelFilter || node.level === levelFilter || node.level === 'root' || node.level === 'group';

      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean);

      if ((matchesQuery && matchesLevel) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return filterNode(hierarchyRoot);
  }, [hierarchyRoot, hierarchyLevelFilter, hierarchySearch]);

  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes((prev) => (
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    ));
  }, []);

  useEffect(() => {
    if (!filteredHierarchy) return;

    const defaultExpandedIds = new Set();
    const collect = (node) => {
      if (!node) return;
      if (node.level === 'group' || node.level === 'root') {
        defaultExpandedIds.add(node.id || node.label);
      }
      (node.children || []).forEach(collect);
    };

    collect(filteredHierarchy);

    if (defaultExpandedIds.size === 0) return;

    setExpandedNodes((prev) => {
      const merged = new Set(prev);
      let changed = false;
      defaultExpandedIds.forEach((id) => {
        if (id && !merged.has(id)) {
          merged.add(id);
          changed = true;
        }
      });
      return changed ? Array.from(merged) : prev;
    });
  }, [filteredHierarchy]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'performance', label: 'Performance KPIs', icon: TrendingUp },
    { key: 'zone', label: 'Zone Analysis', icon: TestTube2 },
    { key: 'consumption', label: 'Consumption by Type', icon: BarChart3 },
    { key: 'hierarchy', label: 'Water Hierarchy', icon: ListTree },
    { key: 'database', label: 'Main Database', icon: Database }
  ];

  const getWaterKPIStats = useCallback(() => {
    if (!analytics) return [];
    const { totals, losses } = analytics;

    return [
      { 
        label: 'A1 - MAIN SOURCE', 
        value: `${(totals.A1 / 1000).toFixed(1)}k m³`,
        subtitle: `${totals.A1.toLocaleString()} m³ total input`,
        icon: Droplets 
      },
      { 
        label: 'A2 - ZONE DISTRIBUTION', 
        value: `${(totals.A2 / 1000).toFixed(1)}k m³`,
        subtitle: 'L2 Zone Bulks + Direct Connections',
        icon: ChevronsRight 
      },
      { 
        label: 'A3 - INDIVIDUAL', 
        value: `${(totals.A3_Individual / 1000).toFixed(1)}k m³`,
        subtitle: 'L3 Villas + L4 Apartments + DC',
        icon: Users 
      },
      { 
        label: 'SYSTEM EFFICIENCY', 
        value: `${totals.efficiency}%`,
        subtitle: 'Target: 85% minimum',
        icon: ArrowRightLeft 
      },
      { 
        label: 'STAGE 1 LOSS', 
        value: `${Math.abs(losses.stage1).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${totals.A1 > 0 ? Math.abs(losses.stage1 / totals.A1 * 100).toFixed(1) : 0}%`,
        icon: Minus 
      },
      { 
        label: 'STAGE 2 LOSS', 
        value: `${Math.abs(losses.stage2).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${totals.A2 > 0 ? Math.abs(losses.stage2 / totals.A2 * 100).toFixed(1) : 0}%`,
        icon: Minus 
      },
      { 
        label: 'TOTAL SYSTEM LOSS', 
        value: `${Math.abs(losses.total).toLocaleString()} m³`,
        subtitle: `Loss Rate: ${totals.A1 > 0 ? Math.abs(losses.total / totals.A1 * 100).toFixed(1) : 0}%`,
        icon: AlertTriangle 
      },
      { 
        label: 'A3 - BULK LEVEL', 
        value: `${(totals.A3_Bulk / 1000).toFixed(1)}k m³`,
        subtitle: 'All L3 meters + Direct Connections',
        icon: ChevronsRight 
      }
    ];
  }, [analytics]); // `analytics` is a state variable.

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

    // Series visibility based on filter
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
                    <XAxis dataKey="month" stroke={chartStrokeColor} />
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
                        dataKey="A1"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fill="url(#gradA1)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 10,
                          fill: '#3B82F6'
                        }}
                      />
                    }
                    {showA2 &&
                      <Area
                        type="monotone"
                        name="A2 - Zone Distribution"
                        dataKey="A2"
                        stroke="#2563EB"
                        strokeWidth={3}
                        fill="url(#gradA2)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 10,
                          fill: '#2563EB'
                        }}
                      />
                    }
                    {showA3 &&
                      <Area
                        type="monotone"
                        name="A3 - Individual"
                        dataKey="A3Ind"
                        stroke="#60A5FA"
                        strokeWidth={3}
                        fill="url(#gradA3)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 10,
                          fill: '#60A5FA'
                        }}
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
                    <XAxis dataKey="month" stroke={chartStrokeColor} />
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
                        dataKey="totalLossVol"
                        stroke="#EF4444"
                        strokeWidth={3}
                        fill="url(#gradLossTotal)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 10,
                          fill: '#EF4444'
                        }}
                      />
                    }
                    {showLossStage1 &&
                      <Area
                        type="monotone"
                        name="Stage 1 Loss"
                        dataKey="stage1Vol"
                        stroke="#DC2626"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#gradLossStage1)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 9,
                          fill: '#DC2626'
                        }}
                      />
                    }
                    {showLossStage2 &&
                      <Area
                        type="monotone"
                        name="Stage 2 Loss"
                        dataKey="stage2Vol"
                        stroke="#F87171"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#gradLossStage2)"
                        dot={false}
                        isAnimationActive
                        animationDuration={500}
                        label={{
                          position: 'top',
                          formatter: (v) => `${Math.round(v / 1000)}k`,
                          fontSize: 9,
                          fill: '#F87171'
                        }}
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

  const renderPerformance = () => {
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly consumption by zone</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WATER_SYSTEM_DATA.zonePerformance}>
                  <XAxis dataKey="zone" stroke={chartStrokeColor} />
                  <YAxis stroke={chartStrokeColor} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Jul25" name="Jul-25" fill="#3b82f6" />
                  <Bar dataKey="Aug25" name="Aug-25" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // REWRITE: renderConsumption to mirror Electricity › Analysis by Type and pull from WaterMeter
  const renderConsumption = () => {
    const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const chartGridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
      backdropFilter: 'blur(5px)',
      borderRadius: '0.5rem',
      padding: '0.75rem',
    };

    const allTypes = [...new Set(meters.map(m => m.meter_type || 'Unknown'))].filter(Boolean);
    const filteredMeters = meters.filter(m => filterType === 'all' || (m.meter_type || 'Unknown') === filterType);

    // Chart data by type
    const consumptionByTypeAll = getWaterConsumptionByType();
    const barData = consumptionByTypeAll;

    // Table rows: meters in the selected type
    const rows = filteredMeters.map(m => ({
      id: m.id,
      meter_label: m.meter_label,
      account_number: m.account_number,
      level: m.level,
      zone: m.zone,
      type: m.meter_type || 'Unknown',
      consumption: Math.round(sumWaterMeterInRange(m))
    })).sort((a, b) => b.consumption - a.consumption);

    return (
      <div className="space-y-6">
        {/* Type filter chips */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setFilterType('all')}
                variant={filterType === 'all' ? 'default' : 'outline'}
                className={`${filterType === 'all' ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'}`}
              >
                All
              </Button>
              {allTypes.map(t => (
                <Button
                  key={t}
                  onClick={() => setFilterType(t)}
                  variant={filterType === t ? 'default' : 'outline'}
                  className={`${filterType === t ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'}`}
                >
                  {t.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <StatsGrid stats={getWaterStatsFromMeters(filteredMeters)} />

        {/* Bar chart by type */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Consumption by Type (m³)</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Aggregated for {availableDateRangeLabel(startDate, endDate)}</p>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v)}`} fontSize={12} stroke={chartStrokeColor} />
                <YAxis type="category" dataKey="type" width={140} fontSize={12} tickLine={false} stroke={chartStrokeColor} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name, props) => [`${Math.round(props.payload.consumption).toLocaleString()} m³ (${props.payload.percentage}%)`, props.payload.type.replace(/_/g,' ')]}
                />
                <Bar dataKey="consumption" barSize={16} radius={[0, 8, 8, 0]}>
                  {barData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Details table */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Meter Details {filterType !== 'all' ? `(${filterType.replace(/_/g,' ')})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableHead className="text-gray-900 dark:text-white">Meter Label</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Account #</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Level</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Zone</TableHead>
                  <TableHead className="text-gray-900 dark:text-white text-right">Consumption (Range)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id || r.meter_label} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium">{r.meter_label}</TableCell>
                    <TableCell>{r.account_number}</TableCell>
                    <TableCell>{r.level}</TableCell>
                    <TableCell>{r.zone}</TableCell>
                    <TableCell className="text-right">{r.consumption.toLocaleString()} m³</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 dark:text-gray-400">No meters for this type in the selected range.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDatabaseView = () => (
    <div className="space-y-6">
      <StatsGrid stats={databaseOverviewStats} />

      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={databaseSearch}
              onChange={(event) => setDatabaseSearch(event.target.value)}
              placeholder="Search by label, account, zone, or parent meter"
              className="pl-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {['all', 'L1', 'L2', 'L3', 'L4', 'DC'].map((level) => (
              <Button
                key={level}
                variant={databaseLevelFilter === level ? 'default' : 'outline'}
                onClick={() => setDatabaseLevelFilter(level)}
                className={`${databaseLevelFilter === level ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white'}`}
              >
                {level === 'all' ? 'All Levels' : level}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {levelBreakdownStats.length > 0 && <StatsGrid stats={levelBreakdownStats} />}

      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Water Meter Database</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive inventory with hierarchy-aware loss tracking</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableHead className="text-gray-900 dark:text-white">Meter Label</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Account #</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Level</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Zone</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Parent Meter</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Type</TableHead>
                  <TableHead className="text-gray-900 dark:text-white text-right">Consumption ({rangeLabel})</TableHead>
                  <TableHead className="text-gray-900 dark:text-white text-right">Loss / Gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDatabaseMeters.map((meter) => {
                  const nodeMetric = hierarchyMetricsMap.get(meter.id || meter.meter_label);
                  const lossVolume = nodeMetric ? nodeMetric.lossVolume : 0;
                  const lossPercent = nodeMetric ? Math.abs(nodeMetric.lossPercent || 0) : 0;
                  const lossStatus = lossVolume >= 0 ? 'Loss' : 'Gain';

                  return (
                    <TableRow key={meter.id || meter.meter_label} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell className="font-medium">{meter.meter_label}</TableCell>
                      <TableCell>{meter.account_number || '—'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium
                          ${meter.level === 'L1' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300' : ''}
                          ${meter.level === 'L2' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300' : ''}
                          ${meter.level === 'L3' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300' : ''}
                          ${meter.level === 'L4' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300' : ''}
                          ${meter.level === 'DC' ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300' : ''}
                        `}>
                          {meter.level || '—'}
                        </span>
                      </TableCell>
                      <TableCell>{meter.zone || '—'}</TableCell>
                      <TableCell className="max-w-xs truncate">{meter.parent_meter || '—'}</TableCell>
                      <TableCell>{meter.meter_type || '—'}</TableCell>
                      <TableCell className="text-right">{Math.round(meter.consumption).toLocaleString()} m³</TableCell>
                      <TableCell className={`text-right ${lossVolume >= 0 ? 'text-red-600' : 'text-emerald-500'}`}>
                        {nodeMetric
                          ? `${lossVolume >= 0 ? '' : '-'}${Math.round(Math.abs(lossVolume)).toLocaleString()} m³ (${lossPercent.toFixed(1)}%) ${lossStatus}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDatabaseMeters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 dark:text-gray-400">
                      No meters found for the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <iframe
              className="airtable-embed"
              src="https://airtable.com/embed/appwGy1JHL1UYsO2W/shrjjfauKyS0ABUfM?viewControls=on"
              frameBorder="0"
              width="100%"
              height="533"
              style={{ background: 'transparent', border: '1px solid #ccc' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const levelBadgeClasses = {
    root: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    group: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    L1: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
    L2: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
    L3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300',
    L4: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300',
    DC: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300'
  };

  const formatSignedVolume = (value) => `${value >= 0 ? '' : '-'}${Math.round(Math.abs(value)).toLocaleString()} m³`;

  const renderHierarchyNode = (node, depth = 0) => {
    if (!node) return null;
    const nodeId = node.id || `${node.label}-${depth}`;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const searchActive = hierarchySearch.trim().length > 0;
    const isExpanded = searchActive || node.level === 'group' || node.level === 'root' || expandedNodes.includes(nodeId);
    const lossPercentLabel = node.lossPercent ? `(${Math.abs(node.lossPercent).toFixed(1)}%)` : '(0.0%)';
    const badgeClass = levelBadgeClasses[node.level] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    const statusClass = node.lossVolume >= 0
      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';

    return (
      <div key={nodeId} className="space-y-3" style={{ marginLeft: depth * 16 }}>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 shadow-sm">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleNode(nodeId)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]/80" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{node.label}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeClass}`}>
                      {node.level === 'group' ? 'Group' : node.level === 'root' ? 'System' : node.level}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusClass}`}>
                      {node.status || 'Balanced'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {node.zone && <span>Zone: {node.zone}</span>}
                    {node.type && <span>Type: {node.type}</span>}
                    {node.meter?.account_number && <span>Acct: {node.meter.account_number}</span>}
                    {hasChildren && <span>{node.meterCount} meter{node.meterCount === 1 ? '' : 's'}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Consumption: {formatSignedVolume(node.totalConsumption)}
                </div>
                {node.level !== 'group' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {node.meter ? (node.lossVolume >= 0 ? 'Loss' : 'Gain') : 'Aggregated'} {lossPercentLabel}
                  </div>
                )}
                {node.level !== 'group' && (
                  <div className={`text-sm font-medium ${node.lossVolume >= 0 ? 'text-red-600' : 'text-emerald-500'}`}>
                    {formatSignedVolume(node.lossVolume)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-3">
            {node.children.map((child) => renderHierarchyNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderHierarchy = () => {
    if (!filteredHierarchy) {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-10 text-center text-gray-500 dark:text-gray-400">
            No hierarchy data available for the selected range.
          </CardContent>
        </Card>
      );
    }

    const nodesToRender = filteredHierarchy.level === 'root'
      ? filteredHierarchy.children || []
      : [filteredHierarchy];

    return (
      <div className="space-y-6">
        {hierarchySummaryStats.length > 0 && <StatsGrid stats={hierarchySummaryStats} />}

        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={hierarchySearch}
                onChange={(event) => setHierarchySearch(event.target.value)}
                placeholder="Search meters, zones, or connections"
                className="pl-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              {['all', 'L1', 'L2', 'L3', 'L4', 'DC'].map((level) => (
                <Button
                  key={level}
                  variant={hierarchyLevelFilter === level ? 'default' : 'outline'}
                  onClick={() => setHierarchyLevelFilter(level)}
                  className={`${hierarchyLevelFilter === level ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white'}`}
                >
                  {level === 'all' ? 'All Levels' : level}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ListTree className="h-5 w-5 text-[var(--accent)]" />
              Water Distribution Hierarchy
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visualizing meter relationships from Main Bulk through Direct Connections and Zone Bulks.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nodesToRender.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No matching nodes for the current filters.</p>
              ) : (
                nodesToRender.map((node) => renderHierarchyNode(node))
              )}
            </div>
          </CardContent>
        </Card>

        {hierarchyZoneBarData.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Zone Bulk Consumption & Loss</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Top zones by consumption with associated loss volumes.</p>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hierarchyZoneBarData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip
                    formatter={(value, key) => [`${Math.round(value).toLocaleString()} m³`, key === 'consumption' ? 'Consumption' : 'Loss']}
                  />
                  <Legend />
                  <Bar dataKey="consumption" name="Consumption" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="loss" name="Loss" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderZone = () => (
    <ZoneAnalysis meters={meters} startDate={startDate} endDate={endDate} />
  );

  // Helper label for selected range
  const availableDateRangeLabel = (s, e) => {
    const fmt = (ym) => {
      const [y, m] = ym.split('-');
      const d = new Date(`${y}-${m}-01T00:00:00`);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };
    return `${fmt(s)} - ${fmt(e)}`;
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
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Retrying... (Attempt {retryCount + 1})
              </p>
            )}
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
              onClick={() => loadDailyData(true)}
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
              onClick={() => loadDailyData(true)}
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

                {/* Custom Dual Range Slider (wider and cleaner) */}
                <div className="flex flex-col gap-4 flex-1 max-w-5xl w-full">
                  <span className="text-sm text-gray-600 dark:text-gray-300 text-center">
                    {monthMapping.find((m) => m.value === sliderRange[0])?.label} - {monthMapping.find((m) => m.value === sliderRange[1])?.label}
                  </span>

                  <div className="relative h-10 px-1 md:px-2 lg:px-4">
                    {/* Background track */}
                    <div className="absolute top-1/2 left-2 right-2 h-5 bg-gray-200 dark:bg-gray-600 rounded-full -translate-y-1/2"></div>

                    {/* Selected range track */}
                    <div className="bg-[var(--accent)] absolute top-1/2 h-5 rounded-full -translate-y-1/2 transition-all duration-200"
                      style={{
                        left: `${2 + (sliderRange[0] - 1) / 7 * (100 - 4)}%`,
                        width: `${(sliderRange[1] - sliderRange[0]) / 7 * (100 - 4)}%`
                      }}>
                    </div>

                    {/* Min slider */}
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={sliderRange[0]}
                      onChange={(e) => {
                        const newStart = parseInt(e.target.value);
                        const currentEnd = sliderRange[1];
                        if (newStart <= currentEnd) {
                          handleSliderChange([newStart, currentEnd]);
                        }
                      }} className="absolute top-1/2 left-0 right-0 w-full h-10 -translate-y-1/2 bg-transparent appearance-none cursor-pointer"
                      style={{
                        background: 'transparent',
                        pointerEvents: 'none'
                      }}
                      onMouseDown={(e) => e.target.style.pointerEvents = 'auto'}
                    />

                    {/* Max slider */}
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={sliderRange[1]}
                      onChange={(e) => {
                        const newEnd = parseInt(e.target.value);
                        const currentStart = sliderRange[0];
                        if (newEnd >= currentStart) {
                          handleSliderChange([currentStart, newEnd]);
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

                  {/* Month labels */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2 mt-1">
                    {monthMapping.map((month) => (
                      <span key={month.value} className="text-center">
                        {month.label.split('-')[0]}
                      </span>
                    ))}
                  </div>
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

          {/* Custom slider styles */}
          <style jsx>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              height: 28px;
              width: 28px;
              background-color: var(--accent); /* Uses accent color */
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
              background-color: var(--accent); /* Uses accent color */
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.1);
              cursor: pointer;
              pointer-events: auto;
              border: none;
            }
            input[type="range"]:active::-webkit-slider-thumb {
              transform: scale(1.15);
              box-shadow: 0 0 0 6px rgba(0, 210, 179, 0.2); /* Accent color with opacity */
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
              {activeTab === 'performance' && renderPerformance()}
              {activeTab === 'consumption' && renderConsumption()}
              {activeTab === 'hierarchy' && renderHierarchy()}
              {activeTab === 'zone' && renderZone()}
              {activeTab === 'database' && renderDatabaseView()}
            </>
          )}
        </>
      )}
    </div>
  );
}
