
import React, { useState, useEffect, useMemo } from "react";
import { Meter } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, TrendingUp, Database, Zap, DollarSign, MapPin } from "lucide-react";
import TabNavigation from "../components/shared/TabNavigation";
import DateRangePicker from "../components/shared/DateRangePicker";
import StatsGrid from "../components/shared/StatsGrid";

export default function Electricity() {
  const [activeTab, setActiveTab] = useState('overview');
  const [startDate, setStartDate] = useState('2024-04');
  const [endDate, setEndDate] = useState('2025-06');
  const [filterType, setFilterType] = useState('all');
  const [meters, setMeters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const ratePerKWh = 0.025;

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('storage', handleThemeChange);

    // Observer to detect changes in the <html> element's class attribute
    // specifically for 'dark' class, which is often used for theme toggling
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                setTheme(newTheme);
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    loadElectricalData();
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const loadElectricalData = async () => {
    setIsLoading(true);
    try {
      const metersData = await Meter.filter({ system_type: 'electricity' });
      setMeters(metersData);
    } catch (error) {
      console.error("Error loading electrical data:", error);
    }
    setIsLoading(false);
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'analysis', label: 'Analysis by Type', icon: TrendingUp },
    { key: 'database', label: 'Database', icon: Database }
  ];

  // Canonical month order present in your dataset
  const allMonths = useMemo(() => ([
    'Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25'
  ]), []);

  const monthKeyToYyyyMm = (m) => {
    const [mon, yy] = m.split('-');
    const idx = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }[mon];
    const year = `20${yy}`;
    return `${year}-${idx}`;
  };

  const monthsInRange = useMemo(() => {
    const s = startDate;
    const e = endDate;
    return allMonths.filter(m => {
      const k = monthKeyToYyyyMm(m);
      return (!s || k >= s) && (!e || k <= e);
    });
  }, [allMonths, startDate, endDate]);

  const sumMeterInRange = (meter) => {
    const r = meter.readings || {};
    return monthsInRange.reduce((acc, m) => acc + (Number(r[m] || 0)), 0);
  };

  const getStatsFromMeters = (filteredMeters = meters) => {
    const totalConsumption = filteredMeters.reduce((sum, meter) => sum + sumMeterInRange(meter), 0);
    const totalCost = totalConsumption * ratePerKWh;
    const highestConsumer = filteredMeters.reduce((max, meter) => {
      const c = sumMeterInRange(meter);
      return c > (max.c || 0) ? { m: meter, c } : max;
    }, { m: null, c: 0 });

    return [
      { label: 'TOTAL CONSUMPTION', value: `${(totalConsumption / 1000).toFixed(2)} MWh`, subtitle: `${Math.round(totalConsumption).toLocaleString()} kWh`, icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
      { label: 'TOTAL COST', value: `${totalCost.toFixed(2)} OMR`, subtitle: `@ ${ratePerKWh.toFixed(3)} OMR/kWh`, icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-100' },
      { label: 'METER COUNT', value: filteredMeters.length.toString(), subtitle: `Type: ${filterType.replace(/_/g, ' ')}`, icon: MapPin, color: 'text-blue-500', bgColor: 'bg-blue-100' },
      { label: 'HIGHEST CONSUMER', value: highestConsumer.m?.name || 'N/A', subtitle: `${Math.round(highestConsumer.c).toLocaleString()} kWh`, icon: TrendingUp, color: 'text-red-500', bgColor: 'bg-red-100' }
    ];
  };
  
  const generateChartData = () => {
    return monthsInRange.map(month => {
      const total = meters.reduce((sum, meter) => sum + Number(meter.readings?.[month] || 0), 0);
      return { month, consumption: Math.round(total) };
    });
  };

  const getConsumptionByType = () => {
    const typeGroups = meters.reduce((acc, meter) => {
      const type = meter.type || 'Unknown';
      const c = sumMeterInRange(meter);
      if (!acc[type]) {
        acc[type] = { type, consumption: 0, count: 0 };
      }
      acc[type].consumption += c;
      acc[type].count += 1;
      return acc;
    }, {});
    const total = Object.values(typeGroups).reduce((sum, group) => sum + group.consumption, 0);
    const colors = ['#00D2B3', '#A2D0C8', '#81D8D0', '#4E4456', '#FFD166', '#FF6B6B', '#8B5CF6', '#10B981'];
    return Object.values(typeGroups).map((group, index) => ({
      ...group,
      percentage: total > 0 ? Math.round((group.consumption / total) * 100) : 0,
      color: colors[index % colors.length]
    })).sort((a, b) => b.consumption - a.consumption);
  };
  
  const renderOverview = () => {
    const consumptionByType = getConsumptionByType();
    const monthlyData = generateChartData();
    const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const chartGridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
      backdropFilter: 'blur(5px)',
      borderRadius: '0.5rem',
    };
    
    return (
      <div className="space-y-6">
        <StatsGrid stats={getStatsFromMeters()} />
        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader><CardTitle className="text-gray-900 dark:text-white">Monthly Consumption Trend (kWh)</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs><linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFD166" stopOpacity={0.4}/><stop offset="95%" stopColor="#FFD166" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke={chartStrokeColor} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} stroke={chartStrokeColor}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value.toLocaleString()} kWh`, 'Consumption']} />
                  <Area type="natural" dataKey="consumption" stroke="#FFD166" strokeWidth={3} fill="url(#consumptionGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader><CardTitle className="text-gray-900 dark:text-white">Consumption by Type</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionByType} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis type="number" tickFormatter={(value) => `${value / 1000}k`} fontSize={12} stroke={chartStrokeColor}/>
                  <YAxis type="category" dataKey="type" width={120} fontSize={12} tickLine={false} stroke={chartStrokeColor} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name, props) => [`${props.payload.consumption.toLocaleString()} kWh (${props.payload.percentage}%)`, props.payload.type]} />
                  <Bar dataKey="consumption" barSize={15} radius={[0, 8, 8, 0]}>
                    {consumptionByType.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
  
  const renderAnalysis = () => {
    const meterTypes = [...new Set(meters.map(m => m.type))];
    const filteredMetersByType = meters.filter(m => filterType === 'all' || m.type === filterType);
    const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const chartGridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
      backdropFilter: 'blur(5px)',
      borderRadius: '0.5rem',
    };
    
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setFilterType('all')} variant={filterType === 'all' ? 'default' : 'outline'} className={`${filterType === 'all' ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'}`}>All</Button>
              {meterTypes.map(type => (
                <Button key={type} onClick={() => setFilterType(type)} variant={filterType === type ? 'default' : 'outline'} className={`${filterType === type ? 'bg-[var(--accent)] text-white' : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'}`}>{type.replace(/_/g, ' ')}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <StatsGrid stats={getStatsFromMeters(filteredMetersByType)} />
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Monthly Trend for {filterType.replace(/_/g, ' ')} (kWh)</CardTitle></CardHeader>
          <CardContent className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateChartData()} >
                  <defs><linearGradient id="analysisGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="month" fontSize={12} stroke={chartStrokeColor}/>
                  <YAxis tickFormatter={(v) => `${v/1000}k`} fontSize={12} stroke={chartStrokeColor}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v.toLocaleString()} kWh`, 'Consumption']} />
                  <Area type="natural" dataKey="consumption" stroke="var(--accent)" strokeWidth={3} fill="url(#analysisGradient)" />
                </AreaChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Meter Details for {filterType.replace(/_/g, ' ')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><TableHead className="text-gray-900 dark:text-white">Name</TableHead><TableHead className="text-gray-900 dark:text-white">Account #</TableHead><TableHead className="text-gray-900 dark:text-white">Consumption (Range)</TableHead><TableHead className="text-gray-900 dark:text-white">Cost (Range)</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredMetersByType.map(meter => {
                  const c = sumMeterInRange(meter);
                  const cost = c * ratePerKWh;
                  return (
                    <TableRow key={meter.id} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>{meter.name}</TableCell>
                      <TableCell>{meter.account_number}</TableCell>
                      <TableCell>{Math.round(c).toLocaleString()} kWh</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400">{cost.toFixed(2)} OMR</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDatabase = () => (
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardHeader><CardTitle className="text-gray-900 dark:text-white">All Meters ({meters.length})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableHead className="text-gray-900 dark:text-white">Name</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Type</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Account #</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Consumption (Range)</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Cost (Range)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meters.map((meter) => {
              const c = sumMeterInRange(meter);
              const cost = c * ratePerKWh;
              return (
                <TableRow key={meter.id} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell>{meter.name}</TableCell>
                  <TableCell><Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{(meter.type || '').replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{meter.account_number}</TableCell>
                  <TableCell>{Math.round(c).toLocaleString()} kWh</TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">{cost.toFixed(2)} OMR</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }}
        onReset={() => { setStartDate('2024-04'); setEndDate('2025-06'); }}
        dateFormat="MMM-yy"
      />
      {isLoading ? <p className="text-gray-900 dark:text-white">Loading data...</p> : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'analysis' && renderAnalysis()}
          {activeTab === 'database' && renderDatabase()}
        </>
      )}
    </div>
  );
}
