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

// WaterMeter entity connected to Supabase
export const WaterMeter = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('Water Meter (Monthly)')
        .select('*');

      if (error) {
        console.error('Error fetching water meters:', error);
        return [];
      }

      // Transform Supabase data to match frontend format
      return (data || []).map((row, index) => ({
        id: index + 1,
        meter_label: row['Meter Label'] || '',
        account_number: row['Acct #'] || '',
        label: row['Label'] || '',
        zone: row['Zone'] || '',
        parent_meter: row['Parent Meter'] || '',
        meter_type: row['Type'] || '',
        level: determineLevel(row['Label']),
        readings: {
          'Jan-25': row['Jan-25'] || 0,
          'Feb-25': row['Feb-25'] || 0,
          'Mar-25': row['Mar-25'] || 0,
          'Apr-25': row['Apr-25'] || 0,
          'May-25': row['May-25'] || 0,
          'Jun-25': row['Jun-25'] || 0,
          'Jul-25': row['Jul-25'] || 0,
          'Aug-25': row['Aug-25'] || 0,
          'Sep-25': row['Sep-25'] || 0
        }
      }));
    } catch (error) {
      console.error('Error in WaterMeter.list():', error);
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
// DailyWaterReading entity connected to Supabase
export const DailyWaterReading = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('Daily_Water_September25')
        .select('*')
        .order('Date', { ascending: true });

      if (error) {
        console.error('Error fetching daily water readings:', error);
        return [];
      }

      // Transform Supabase data to match frontend format
      return (data || []).map((row, index) => {
        // Parse date - handle multiple possible formats
        let dateString = '';
        let dayNumber = 1;

        if (row['Date']) {
          // If Date is a full date string (e.g., "2025-09-15")
          dateString = row['Date'];
          const dateParts = dateString.split('-');
          if (dateParts.length === 3) {
            dayNumber = parseInt(dateParts[2], 10);
          }
        } else if (row['Day']) {
          // If there's a Day column, construct the date
          dayNumber = parseInt(row['Day'], 10);
          dateString = `2025-09-${String(dayNumber).padStart(2, '0')}`;
        }

        return {
          id: index + 1,
          date: dateString,  // Format: "YYYY-MM-DD"
          day: dayNumber,  // Day of month (1-31)
          zone: row['Zone'] || row['zone'] || '',
          l2_total_m3: parseFloat(row['L2_Total_m3'] || row['L2 Total m3'] || row['Bulk_m3'] || 0),
          l3_total_m3: parseFloat(row['L3_Total_m3'] || row['L3 Total m3'] || row['Individual_m3'] || 0),
          loss_m3: parseFloat(row['Loss_m3'] || row['Loss m3'] || 0)
        };
      });
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
