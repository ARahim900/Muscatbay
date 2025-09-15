import React, { useEffect, useState } from "react";
import { DailyWaterReading } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import FilterControls from "../components/water/daily/FilterControls";
import ConsumptionGauges from "../components/water/daily/ConsumptionGauges";
import ConsumptionTrendChart from "../components/water/daily/ConsumptionTrendChart";
import KpiCards from "../components/water/daily/KpiCards";
import AnomalyReport from "../components/water/daily/AnomalyReport";
import ConsumptionTable from "../components/water/daily/ConsumptionTable";

export default function WaterDaily() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZones, setSelectedZones] = useState([]);
  const [dateRange, setDateRange] = useState([1, 30]);
  const [processedData, setProcessedData] = useState([]);
  const [availableDates, setAvailableDates] = useState({ min: 1, max: 30, month: 'Jun', year: '2025' });
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await DailyWaterReading.list();
        // Ensure data is an array
        const safeData = Array.isArray(data) ? data : [];
        setRecords(safeData);

        if (safeData.length > 0) {
          // Safe extraction of months with null checks
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

                // Safe zone extraction
                const zones = monthRecords
                  .map(r => r.zone)
                  .filter(zone => zone && typeof zone === 'string')
                  .filter((zone, index, arr) => arr.indexOf(zone) === index)
                  .sort();

                if (zones.length > 0) {
                  setSelectedZones([zones[0]]);
                }
              }
            }
          }
        } else {
          // Reset everything if no data
          setAvailableMonths([]);
          setSelectedMonthKey(null);
          setAvailableDates({ min: 1, max: 30, month: '', year: '' });
          setDateRange([1, 30]);
          setSelectedZones([]);
        }
      } catch (error) {
        console.error("Error loading daily water data:", error);
        // Reset to safe defaults on error
        setRecords([]);
        setAvailableMonths([]);
        setSelectedMonthKey(null);
        setSelectedZones([]);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // Month change effect with proper null checks
  useEffect(() => {
    if (!selectedMonthKey || !Array.isArray(records) || records.length === 0) return;
    
    const monthRecords = records.filter(r => r && r.date && r.date.startsWith(selectedMonthKey));
    if (monthRecords.length === 0) {
      setAvailableDates({ min: 1, max: 30, month: '', year: '' });
      setDateRange([1, 30]);
      setSelectedZones([]);
      return;
    }

    const days = monthRecords.map(r => r.day).filter(day => typeof day === 'number' && !isNaN(day));
    if (days.length === 0) return;

    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);
    
    try {
      const d = new Date(`${selectedMonthKey}-01T00:00:00`);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = `${d.getFullYear()}`;

      setAvailableDates({ min: minDay, max: maxDay, month, year });

      setDateRange(prevRange => {
        if (!Array.isArray(prevRange) || prevRange.length !== 2) {
          return [minDay, maxDay];
        }
        const newMin = Math.max(minDay, prevRange[0]);
        const newMax = Math.min(maxDay, prevRange[1]);
        return newMin > newMax ? [minDay, maxDay] : [newMin, newMax];
      });

      const zonesForMonth = monthRecords
        .map(r => r.zone)
        .filter(zone => zone && typeof zone === 'string')
        .filter((zone, index, arr) => arr.indexOf(zone) === index)
        .sort();

      if (zonesForMonth.length > 0) {
        setSelectedZones(prevSelected => {
          const safeSelected = Array.isArray(prevSelected) ? prevSelected : [];
          const currentSelectedZonesStillAvailable = safeSelected.filter(zone => zonesForMonth.includes(zone));
          if (currentSelectedZonesStillAvailable.length === 0) {
            return [zonesForMonth[0]];
          } else if (currentSelectedZonesStillAvailable.length !== safeSelected.length) {
            return currentSelectedZonesStillAvailable;
          }
          return safeSelected;
        });
      } else {
        setSelectedZones([]);
      }
    } catch (e) {
      console.error("Error processing month change:", e);
    }
  }, [selectedMonthKey, records]);

  // Data processing effect with null checks
  useEffect(() => {
    if (!Array.isArray(records) || records.length === 0 || !selectedMonthKey) {
      setProcessedData([]);
      return;
    }

    const monthRecords = records.filter(r => r && r.date && r.date.startsWith(selectedMonthKey));
    if (monthRecords.length === 0) {
      setProcessedData([]);
      return;
    }

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
          date: `${availableDates.month || 'Jun'} ${day}, ${availableDates.year || '2025'}`,
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
      console.error("Error processing data:", e);
      setProcessedData([]);
    }
  }, [records, selectedZones, dateRange, availableDates, selectedMonthKey]);

  // Get available zones for the selected month with null checks
  const availableZones = React.useMemo(() => {
    if (!selectedMonthKey || !Array.isArray(records)) return [];
    const monthRecords = records.filter(r => r && r.date && r.date.startsWith(selectedMonthKey));
    return monthRecords
      .map(r => r.zone)
      .filter(zone => zone && typeof zone === 'string')
      .filter((zone, index, arr) => arr.indexOf(zone) === index)
      .sort();
  }, [records, selectedMonthKey]);

  const getDynamicTitle = () => {
    const safeSelectedZones = Array.isArray(selectedZones) ? selectedZones : [];
    if (safeSelectedZones.length === 1) {
      return `${safeSelectedZones[0].replace(/_/g, " ")} Analysis`;
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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white">Loading daily water data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!Array.isArray(records) || records.length === 0 || (selectedMonthKey && availableZones.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-900 dark:text-white">No water data available for the selected period.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-6">
      <FilterControls
        selectedZones={selectedZones || []}
        onZonesChange={setSelectedZones}
        availableZones={availableZones || []}
        dateRange={dateRange || [1, 30]}
        onDateRangeChange={setDateRange}
        onReset={() => {
          const monthRecordsForReset = Array.isArray(records) ? records.filter(r => r && r.date && r.date.startsWith(selectedMonthKey || '')) : [];
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {getDynamicTitle()}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {getSubtitle()}
        </p>
      </div>

      <ConsumptionGauges data={Array.isArray(processedData) ? processedData : []} />

      <ConsumptionTrendChart 
        data={Array.isArray(processedData) ? processedData : []}
        selectedZones={Array.isArray(selectedZones) ? selectedZones : []}
        records={Array.isArray(records) ? records.filter(r => r && r.date && r.date.startsWith(selectedMonthKey || '')) : []}
        dateRange={Array.isArray(dateRange) && dateRange.length === 2 ? dateRange : [1, 30]}
      />

      <KpiCards data={Array.isArray(processedData) ? processedData : []} />

      {Array.isArray(selectedZones) && selectedZones.length === 1 && (
        <AnomalyReport data={Array.isArray(processedData) ? processedData : []} zoneName={selectedZones[0] || ''} />
      )}

      {Array.isArray(selectedZones) && selectedZones.length === 1 && (
        <ConsumptionTable data={Array.isArray(processedData) ? processedData : []} />
      )}
    </div>
  );
}