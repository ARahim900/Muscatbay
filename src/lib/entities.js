// Entity implementations with Supabase backend integration
import { supabase } from './supabaseClient';

const createEntityStub = (entityName) => ({
  list: async () => {
    console.warn(`${entityName}.list() called - implement custom backend`);
    return [];
  },
  find: async (id) => {
    console.warn(`${entityName}.find() called - implement custom backend`);
    return null;
  },
  create: async (data) => {
    console.warn(`${entityName}.create() called - implement custom backend`);
    return { id: Date.now(), ...data };
  },
  update: async (id, data) => {
    console.warn(`${entityName}.update() called - implement custom backend`);
    return { id, ...data };
  },
  delete: async (id) => {
    console.warn(`${entityName}.delete() called - implement custom backend`);
    return { success: true };
  }
});

// WaterMeter entity connected to Supabase with new schema
export const WaterMeter = {
  list: async () => {
    try {
      // Get meters with their monthly readings
      const { data: meters, error: metersError } = await supabase
        .from('meters')
        .select(`
          *,
          zones(zone_name),
          buildings(building_name),
          monthly_readings(reading_year, reading_month, consumption_m3)
        `)
        .eq('is_active', true);

      if (metersError) {
        console.error('Error fetching water meters:', metersError);
        return [];
      }

      // Transform data to match frontend format
      return (meters || []).map((meter) => {
        // Build readings object from monthly_readings
        const readings = {};
        if (meter.monthly_readings) {
          meter.monthly_readings.forEach(reading => {
            const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthKey = `${monthNames[reading.reading_month]}-${reading.reading_year.toString().slice(-2)}`;
            readings[monthKey] = reading.consumption_m3 || 0;
          });
        }

        return {
          id: meter.id,
          meter_label: meter.meter_label || '',
          account_number: meter.account_number || '',
          label: meter.meter_type || '',
          zone: meter.zones?.zone_name || '',
          parent_meter: meter.parent_meter_id ? `Parent-${meter.parent_meter_id}` : '',
          meter_type: meter.meter_description || '',
          level: meter.meter_type || 'Unknown',
          building: meter.buildings?.building_name || '',
          readings: {
            'Jan-25': readings['Jan-25'] || 0,
            'Feb-25': readings['Feb-25'] || 0,
            'Mar-25': readings['Mar-25'] || 0,
            'Apr-25': readings['Apr-25'] || 0,
            'May-25': readings['May-25'] || 0,
            'Jun-25': readings['Jun-25'] || 0,
            'Jul-25': readings['Jul-25'] || 0,
            'Aug-25': readings['Aug-25'] || 0,
            'Sep-25': readings['Sep-25'] || 0
          }
        };
      });
    } catch (error) {
      console.error('Error in WaterMeter.list():', error);
      return [];
    }
  },

  // Get A-values for a specific month
  getAValues: async (year = 2025, month = 7) => {
    try {
      const { data, error } = await supabase.rpc('calculate_a_values', {
        target_year: year,
        target_month: month
      });

      if (error) {
        console.error('Error calculating A-values:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in WaterMeter.getAValues():', error);
      return null;
    }
  },

  // Get zone performance analysis
  getZonePerformance: async (year = 2025, month = 7) => {
    try {
      const { data, error } = await supabase.rpc('get_zone_performance', {
        target_year: year,
        target_month: month
      });

      if (error) {
        console.error('Error getting zone performance:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in WaterMeter.getZonePerformance():', error);
      return [];
    }
  },

  // Get building analysis
  getBuildingAnalysis: async (year = 2025, month = 7) => {
    try {
      const { data, error } = await supabase.rpc('get_building_analysis', {
        target_year: year,
        target_month: month
      });

      if (error) {
        console.error('Error getting building analysis:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in WaterMeter.getBuildingAnalysis():', error);
      return [];
    }
  },

  // Get monthly trends
  getMonthlyTrends: async (startYear = 2025, startMonth = 1, endYear = 2025, endMonth = 9) => {
    try {
      const { data, error } = await supabase.rpc('get_monthly_trends', {
        start_year: startYear,
        start_month: startMonth,
        end_year: endYear,
        end_month: endMonth
      });

      if (error) {
        console.error('Error getting monthly trends:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in WaterMeter.getMonthlyTrends():', error);
      return [];
    }
  },

  find: async (id) => {
    try {
      const meters = await WaterMeter.list();
      return meters.find(m => m.id === id) || null;
    } catch (error) {
      console.error('Error in WaterMeter.find():', error);
      return null;
    }
  },

  create: async (data) => {
    console.warn('WaterMeter.create() - implement if needed');
    return { id: Date.now(), ...data };
  },

  update: async (id, data) => {
    console.warn('WaterMeter.update() - implement if needed');
    return { id, ...data };
  },

  delete: async (id) => {
    console.warn('WaterMeter.delete() - implement if needed');
    return { success: true };
  }
};

// Helper function to determine meter level based on label
function determineLevel(label) {
  if (!label) return 'Unknown';
  
  const labelUpper = label.toUpperCase();
  
  // L1: Main source meters (A1, A2)
  if (labelUpper.includes('A1') || labelUpper.includes('A2')) {
    return 'L1';
  }
  
  // L2: Zone bulk meters (A3)
  if (labelUpper.includes('A3')) {
    return 'L2';
  }
  
  // L3: Secondary distribution
  if (labelUpper.includes('L3') || labelUpper.includes('SECONDARY')) {
    return 'L3';
  }
  
  // L4: End users
  if (labelUpper.includes('L4') || labelUpper.includes('END USER')) {
    return 'L4';
  }
  
  // DC: Direct connections
  if (labelUpper.includes('DC') || labelUpper.includes('DIRECT')) {
    return 'DC';
  }
  
  return 'Unknown';
}

export const System = createEntityStub('System');
export const Alert = createEntityStub('Alert');
export const Contractor = createEntityStub('Contractor');
export const Meter = createEntityStub('Meter');
export const Contract = createEntityStub('Contract');
export const STPOperation = createEntityStub('STPOperation');
export const FireSafetyEquipment = createEntityStub('FireSafetyEquipment');
export const HvacMaintenanceLog = createEntityStub('HvacMaintenanceLog');
// DailyWaterReading entity connected to Supabase with new schema
export const DailyWaterReading = {
  list: async () => {
    try {
      // For now, continue using the existing daily table structure
      // This can be updated later to use the new daily_readings table
      const { data, error } = await supabase
        .from('Daily_Water_September25')
        .select('*')
        .order('Meter Label', { ascending: true });

      if (error) {
        console.error('Error fetching daily water readings:', error);
        return [];
      }

      // Transform Supabase data to match frontend format
      return (data || []).map((row, index) => {
        // Parse daily readings from columns 1-20
        const dailyReadings = {};
        for (let day = 1; day <= 20; day++) {
          const dayValue = row[day.toString()];
          if (dayValue !== null && dayValue !== undefined && dayValue !== '~') {
            dailyReadings[day] = parseFloat(dayValue) || 0;
          }
        }

        return {
          id: index + 1,
          meter_label: row['Meter Label'] || '',
          account_number: row['Acct #'] || '',
          zone: row['Zone'] || '',
          level: row['Label'] || '',
          daily_readings: dailyReadings,
          // Create individual records for each day with data
          records: Object.entries(dailyReadings).map(([day, consumption]) => ({
            id: `${index + 1}-${day}`,
            date: `2025-09-${String(day).padStart(2, '0')}`,
            day: parseInt(day),
            zone: row['Zone'] || '',
            l2_total_m3: consumption, // Using consumption as L2 for now
            l3_total_m3: consumption * 0.8, // Estimate L3 as 80% of L2
            loss_m3: consumption * 0.2 // Estimate loss as 20% of L2
          }))
        };
      }).flatMap(item => item.records); // Flatten to get individual day records
    } catch (error) {
      console.error('Error in DailyWaterReading.list():', error);
      return [];
    }
  },

  find: async (id) => {
    try {
      const readings = await DailyWaterReading.list();
      return readings.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Error in DailyWaterReading.find():', error);
      return null;
    }
  },

  // Get readings for a specific date range
  getByDateRange: async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('Daily_Water_September25')
        .select('*')
        .gte('Date', startDate)
        .lte('Date', endDate)
        .order('Date', { ascending: true });

      if (error) {
        console.error('Error fetching daily water readings by date range:', error);
        return [];
      }

      return (data || []).map((row, index) => {
        let dateString = row['Date'] || '';
        let dayNumber = 1;

        if (dateString) {
          const dateParts = dateString.split('-');
          if (dateParts.length === 3) {
            dayNumber = parseInt(dateParts[2], 10);
          }
        }

        return {
          id: index + 1,
          date: dateString,
          day: dayNumber,
          zone: row['Zone'] || row['zone'] || '',
          l2_total_m3: parseFloat(row['L2_Total_m3'] || row['L2 Total m3'] || row['Bulk_m3'] || 0),
          l3_total_m3: parseFloat(row['L3_Total_m3'] || row['L3 Total m3'] || row['Individual_m3'] || 0),
          loss_m3: parseFloat(row['Loss_m3'] || row['Loss m3'] || 0)
        };
      });
    } catch (error) {
      console.error('Error in DailyWaterReading.getByDateRange():', error);
      return [];
    }
  },

  // Get readings for a specific zone
  getByZone: async (zone) => {
    try {
      const { data, error } = await supabase
        .from('Daily_Water_September25')
        .select('*')
        .eq('Zone', zone)
        .order('Date', { ascending: true });

      if (error) {
        console.error('Error fetching daily water readings by zone:', error);
        return [];
      }

      return (data || []).map((row, index) => {
        let dateString = row['Date'] || '';
        let dayNumber = 1;

        if (dateString) {
          const dateParts = dateString.split('-');
          if (dateParts.length === 3) {
            dayNumber = parseInt(dateParts[2], 10);
          }
        }

        return {
          id: index + 1,
          date: dateString,
          day: dayNumber,
          zone: row['Zone'] || row['zone'] || '',
          l2_total_m3: parseFloat(row['L2_Total_m3'] || row['L2 Total m3'] || row['Bulk_m3'] || 0),
          l3_total_m3: parseFloat(row['L3_Total_m3'] || row['L3 Total m3'] || row['Individual_m3'] || 0),
          loss_m3: parseFloat(row['Loss_m3'] || row['Loss m3'] || 0)
        };
      });
    } catch (error) {
      console.error('Error in DailyWaterReading.getByZone():', error);
      return [];
    }
  },

  create: async (data) => {
    console.warn('DailyWaterReading.create() - implement if needed');
    return { id: Date.now(), ...data };
  },

  update: async (id, data) => {
    console.warn('DailyWaterReading.update() - implement if needed');
    return { id, ...data };
  },

  delete: async (id) => {
    console.warn('DailyWaterReading.delete() - implement if needed');
    return { success: true };
  }
};
export const MaintenanceSchedule = createEntityStub('MaintenanceSchedule');
export const MaintenanceHistory = createEntityStub('MaintenanceHistory');

// Auth stub
export const User = {
  login: async (credentials) => {
    console.warn('User.login() called - implement custom authentication');
    return { token: 'stub-token', user: { id: 1, name: 'Admin' } };
  },
  logout: async () => {
    console.warn('User.logout() called - implement custom authentication');
    return { success: true };
  },
  getCurrentUser: async () => {
    console.warn('User.getCurrentUser() called - implement custom authentication');
    return { id: 1, name: 'Admin' };
  }
};
