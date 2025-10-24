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

### ✅ Water System - Daily Analysis

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

---

### ✅ Water System - Daily Analysis

**Status**: Fully Connected

**Supabase Table**: `Daily_Water_September25`

**Frontend Pages**:
- `/Water` - Water System page (Daily view toggle)
- `/WaterDaily` - Dedicated daily analysis page

**Entity**: `DailyWaterReading` in `src/lib/entities.js`

**Expected Table Schema**:

The entity is flexible and can handle multiple column naming conventions:

```sql
create table public."Daily_Water_September25" (
  "Date" text,              -- Full date "YYYY-MM-DD" (e.g., "2025-09-15")
  -- OR "Day" integer,      -- Day of month (1-31)
  "Zone" text,              -- Zone identifier (e.g., "Zone_01_(FM)")
  "L2_Total_m3" numeric,    -- Bulk meter reading (zone level)
  -- OR "L2 Total m3" numeric,
  -- OR "Bulk_m3" numeric,
  "L3_Total_m3" numeric,    -- Individual meters total
  -- OR "L3 Total m3" numeric,
  -- OR "Individual_m3" numeric,
  "Loss_m3" numeric         -- Calculated loss (L2 - L3)
  -- OR "Loss m3" numeric
) TABLESPACE pg_default;
```

**Column Mapping** (Flexible):

The entity automatically maps these column variations:
- **Date**: `Date` (primary) or constructed from `Day`
- **Zone**: `Zone` or `zone`
- **L2 Bulk**: `L2_Total_m3`, `L2 Total m3`, or `Bulk_m3`
- **L3 Individual**: `L3_Total_m3`, `L3 Total m3`, or `Individual_m3`
- **Loss**: `Loss_m3` or `Loss m3`

**Data Transformation**:

The `DailyWaterReading.list()` method transforms Supabase data:

```javascript
{
  id: 1,                              // Auto-generated
  date: "2025-09-15",                // From "Date" column
  day: 15,                           // Extracted from date
  zone: "Zone_01_(FM)",              // From "Zone"
  l2_total_m3: 1234.56,             // From "L2_Total_m3" (or variants)
  l3_total_m3: 1100.23,             // From "L3_Total_m3" (or variants)
  loss_m3: 134.33                    // From "Loss_m3" (or variants)
}
```

**Available Methods**:

1. **`DailyWaterReading.list()`** - Get all daily readings
   ```javascript
   const readings = await DailyWaterReading.list();
   ```

2. **`DailyWaterReading.getByDateRange(startDate, endDate)`** - Filter by date range
   ```javascript
   const readings = await DailyWaterReading.getByDateRange('2025-09-01', '2025-09-30');
   ```

3. **`DailyWaterReading.getByZone(zone)`** - Filter by specific zone
   ```javascript
   const readings = await DailyWaterReading.getByZone('Zone_01_(FM)');
   ```

**Features Enabled**:

1. **Filter Controls**:
   - Month selector (automatically detects available months from data)
   - Multi-zone selection
   - Date range slider (day 1-31)

2. **Visualizations**:
   - Consumption gauges (Bulk, Individual, Loss) - radial charts
   - Trend charts (area chart for single zone, line chart for multi-zone)
   - Daily consumption table with pagination

3. **Analytics**:
   - 5 KPI cards (total consumption, average daily, peak day, etc.)
   - Anomaly detection (statistical analysis of unusual patterns)
   - Loss percentage tracking
   - Day-by-day breakdown

4. **Data Processing**:
   - Automatic aggregation across selected zones
   - Loss calculation: `Loss = Bulk (L2) - Individual (L3)`
   - Loss percentage: `Loss % = (Loss / Bulk) × 100`
   - Status indicators: "Loss" or "Gain" based on calculation

**Frontend Data Flow**:

```
User selects zones & date range
    ↓
DailyWaterReading.list() called
    ↓
Supabase query to Daily_Water_September25
    ↓
Data transformation (column mapping)
    ↓
Filter by selected month
    ↓
Aggregate data for selected zones
    ↓
Process day-by-day calculations
    ↓
Render charts, gauges, tables
```

## Testing the Connection

### Method 1: Navigate to Water System Page

#### Testing Monthly Data

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Navigate to "Water System" from the sidebar
4. Ensure "Monthly Dashboard" view is selected (default)
5. The page should load meter data from Supabase
6. Check the browser console for connection logs

**Expected Behavior**:
- Overview tab shows consumption statistics
- Monthly trends chart displays data
- Zone performance cards appear with real data
- Database tab shows complete meter listing

#### Testing Daily Data

1. Navigate to "Water System" page
2. Click the "Daily Analysis" toggle button
3. The page should load daily readings from Supabase
4. Check the browser console for connection logs

**Expected Behavior**:
- Month selector appears with available months (auto-detected)
- Zone multi-select shows available zones from data
- Consumption gauges display with real values
- Trend chart shows daily patterns
- KPI cards show aggregated metrics
- Daily consumption table displays all readings

**Console Success Messages**:
```
🔍 Loading daily water data...
✅ Successfully loaded daily readings
📊 Found 300 daily records
📅 Available months: Sep 2025
🗺️ Zones: Zone_01_(FM), Zone_03_(A), Zone_03_(B), ...
```

### Method 2: Use Browser Console

Open browser console and test the entities directly:

#### Test Monthly Data
```javascript
import { WaterMeter } from '@/lib/entities';

// Get all meters
const meters = await WaterMeter.list();
console.log('Meters:', meters.length);
console.log('Sample:', meters[0]);
```

#### Test Daily Data
```javascript
import { DailyWaterReading } from '@/lib/entities';

// Get all daily readings
const readings = await DailyWaterReading.list();
console.log('Daily readings:', readings.length);
console.log('Sample:', readings[0]);

// Get readings for a specific date range
const septReadings = await DailyWaterReading.getByDateRange('2025-09-01', '2025-09-30');
console.log('September readings:', septReadings.length);

// Get readings for a specific zone
const zoneReadings = await DailyWaterReading.getByZone('Zone_01_(FM)');
console.log('Zone readings:', zoneReadings.length);
```

### Expected Console Output

**Monthly Data Success**:
```
✅ Successfully connected to Supabase!
📊 Found 50 water meters
📋 Sample meter: {
  id: 1,
  meter_label: "Zone_01_(FM)",
  level: "L2",
  readings: { "Jan-25": 32580, ... }
}
```

**Daily Data Success**:
```
✅ Successfully loaded daily readings
📊 Found 300 daily records
📋 Sample reading: {
  id: 1,
  date: "2025-09-15",
  day: 15,
  zone: "Zone_01_(FM)",
  l2_total_m3: 1234.56,
  l3_total_m3: 1100.23,
  loss_m3: 134.33
}
```

**Failure**:
```
❌ Error fetching data from Supabase
Error: [error message details]
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

1. ~~**Daily Water Readings**~~ - ✅ **CONNECTED** (Daily_Water_September25)
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

## Quick Reference: Connected Tables

| Table Name | Entity | Status | Page |
|------------|--------|--------|------|
| `Water Meter (Monthly)` | `WaterMeter` | ✅ Connected | Water System (Monthly) |
| `Daily_Water_September25` | `DailyWaterReading` | ✅ Connected | Water System (Daily) |

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Database                        │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ Water Meter (Monthly)│  │ Daily_Water_September25     │  │
│  └──────────┬───────────┘  └─────────────┬───────────────┘  │
└─────────────┼──────────────────────────────┼─────────────────┘
              │                              │
              ▼                              ▼
      ┌───────────────┐              ┌──────────────────┐
      │  WaterMeter   │              │ DailyWaterReading│
      │    Entity     │              │     Entity       │
      └───────┬───────┘              └────────┬─────────┘
              │                               │
              ▼                               ▼
      ┌──────────────────────────────────────────────┐
      │          Water.jsx Component                  │
      │  ┌────────────────┐  ┌──────────────────┐   │
      │  │ Monthly View   │  │   Daily View     │   │
      │  │ - Overview     │  │ - Gauges         │   │
      │  │ - Database     │  │ - Trend Charts   │   │
      │  │ - Hierarchy    │  │ - KPI Cards      │   │
      │  │ - Analysis     │  │ - Table          │   │
      │  └────────────────┘  └──────────────────┘   │
      └──────────────────────────────────────────────┘
```

---

**Last Updated**: October 24, 2025
**Integration Status**:
- Water System Monthly - ✅ Connected
- Water System Daily - ✅ Connected
