# Supabase Integration Guide

## Overview

This document describes the Supabase backend integration for the Facility Management System.

## Connection Details

- **Project URL**: `https://mtkgpoeaukfmndncfxts.supabase.co`
- **Project ID**: `mtkgpoeaukfmndncfxts`
- **Client Configuration**: `src/lib/supabaseClient.js`

## Connected Features

### ✅ Water System - Monthly Analysis

**Status**: Fully Connected

**Supabase Table**: `Water Meter (Monthly)`

**Frontend Pages**:
- `/Water` - Water System page (Monthly view)

**Entity**: `WaterMeter` in `src/lib/entities.js`

**Table Schema**:
```sql
create table public."Water Meter (Monthly)" (
  "Meter Label" text null,
  "Acct #" text null,
  "Label" text null,
  "Zone" text null,
  "Parent Meter" text null,
  "Type" text null,
  "Jan-25" bigint null,
  "Feb-25" bigint null,
  "Mar-25" bigint null,
  "Apr-25" bigint null,
  "May-25" bigint null,
  "Jun-25" bigint null,
  "Jul-25" bigint null,
  "Aug-25" bigint null,
  "Sep-25" bigint null
) TABLESPACE pg_default;
```

**Data Transformation**:

The `WaterMeter.list()` method transforms Supabase data to match the frontend format:

```javascript
{
  id: 1,                              // Auto-generated
  meter_label: "Zone_01_(FM)",        // From "Meter Label"
  account_number: "12345",            // From "Acct #"
  label: "A1",                        // From "Label"
  zone: "Zone_01_(FM)",               // From "Zone"
  parent_meter: "Main_Source",        // From "Parent Meter"
  meter_type: "Commercial",           // From "Type"
  level: "L1",                        // Auto-determined from Label
  readings: {
    'Jan-25': 32580,                  // From "Jan-25"
    'Feb-25': 44043,                  // From "Feb-25"
    'Mar-25': 34915,                  // From "Mar-25"
    'Apr-25': 46039,                  // From "Apr-25"
    'May-25': 58425,                  // From "May-25"
    'Jun-25': 41840,                  // From "Jun-25"
    'Jul-25': 41475,                  // From "Jul-25"
    'Aug-25': 41743,                  // From "Aug-25"
    'Sep-25': 0                       // From "Sep-25"
  }
}
```

**Level Determination Logic**:

The system automatically determines the meter hierarchy level based on the `Label` field:

- **L1** (Main Source): Labels containing "A1" or "A2"
- **L2** (Zone Bulks): Labels containing "A3"
- **L3** (Secondary Distribution): Labels containing "L3" or "SECONDARY"
- **L4** (End Users): Labels containing "L4" or "END USER"
- **DC** (Direct Connections): Labels containing "DC" or "DIRECT"
- **Unknown**: Any other label format

**Features Enabled**:

1. **Overview Tab**:
   - Total consumption statistics
   - Monthly trends visualization
   - A-values analysis (A1, A2, A3 Individual, A3 Bulk)
   - Loss analysis (Stage 1, Stage 2, Total)
   - System efficiency metrics

2. **Database Tab**:
   - Complete meter listing with all fields
   - Search by meter label, account number, zone, parent meter, or type
   - Filter by hierarchy level (L1, L2, L3, L4, DC)
   - Consumption totals for selected date range
   - Level breakdown statistics

3. **Hierarchy Tab**:
   - Tree view of meter relationships
   - Parent-child meter connections
   - Hierarchical consumption rollup
   - Expandable/collapsible nodes
   - Search and filter by level

4. **Analysis by Type Tab**:
   - Consumption grouped by meter type
   - Percentage distribution
   - Visual charts and graphs
   - Type-specific statistics

## Testing the Connection

### Method 1: Navigate to Water System Page

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Navigate to "Water System" from the sidebar
4. The page should load meter data from Supabase
5. Check the browser console for connection logs

### Method 2: Use Test Script

```javascript
import { testSupabaseConnection } from './lib/testSupabase';

// Run in browser console or component
testSupabaseConnection().then(result => {
  console.log('Connection test result:', result);
});
```

### Expected Console Output

**Success**:
```
🔍 Testing Supabase connection...
✅ Successfully connected to Supabase!
📊 Found 50 water meters
📋 Sample meter data: { id: 1, meter_label: "Zone_01_(FM)", ... }
```

**Failure**:
```
🔍 Testing Supabase connection...
❌ Supabase connection failed: [error message]
```

## Troubleshooting

### Issue: No data appears on Water System page

**Possible Causes**:
1. Supabase table is empty
2. Table name doesn't match exactly (case-sensitive)
3. Network connectivity issues
4. Supabase project is paused (free tier)

**Solutions**:
1. Verify data exists in Supabase dashboard
2. Check table name: `Water Meter (Monthly)` (with parentheses and space)
3. Check browser console for error messages
4. Verify Supabase project is active

### Issue: CORS errors

**Solution**: Supabase automatically handles CORS for the anon key. If you see CORS errors, verify:
1. The project URL is correct
2. The anon key is valid
3. The Supabase project is not paused

### Issue: Authentication errors

**Solution**: The current implementation uses the anon (public) key. For Row Level Security (RLS):
1. Disable RLS on the table for testing, OR
2. Create appropriate RLS policies in Supabase dashboard

## Next Steps

### Connect Additional Tables

To connect more tables to Supabase, follow this pattern:

1. **Create/Identify Supabase Table**
2. **Update Entity in `src/lib/entities.js`**:

```javascript
export const DailyWaterReading = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('your_table_name')
        .select('*');

      if (error) {
        console.error('Error fetching data:', error);
        return [];
      }

      // Transform data to match frontend format
      return (data || []).map(row => ({
        // Map columns here
      }));
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  },
  // ... other methods
};
```

3. **Test the connection**
4. **Update documentation**

### Recommended Tables to Connect Next

1. **Daily Water Readings** - For Water System Daily view
2. **Contractors** - For Contractor Tracker page
3. **Contracts** - For Contractor Tracker page
4. **Electricity Meters** - For Electricity System page
5. **HVAC Maintenance Logs** - For HVAC System page
6. **Fire Safety Equipment** - For Firefighting page
7. **STP Operations** - For STP Plant page

## Security Considerations

### Current Setup
- Using anon (public) key for read access
- No authentication required
- Suitable for internal applications

### Production Recommendations
1. **Enable Row Level Security (RLS)** on all tables
2. **Implement authentication** using Supabase Auth
3. **Create RLS policies** to restrict data access
4. **Use environment variables** for sensitive keys
5. **Implement role-based access control**

### Example: Moving Keys to Environment Variables

1. Create `.env` file:
```env
VITE_SUPABASE_URL=https://mtkgpoeaukfmndncfxts.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Update `src/lib/supabaseClient.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

3. Add `.env` to `.gitignore`

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Supabase dashboard for data and table structure
3. Review this documentation
4. Check Supabase documentation: https://supabase.com/docs

---

**Last Updated**: October 22, 2025  
**Integration Status**: Water System Monthly - ✅ Connected
