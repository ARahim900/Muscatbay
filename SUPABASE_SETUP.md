# Supabase Database Setup Guide

## Do I Need to Run SQL Scripts?

**YES, if the table doesn't exist yet in Supabase!**

Follow the steps below to check and set up your Supabase database.

---

## Step 1: Check if Table Exists

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **mtkgpoeaukfmndncfxts**
3. Click on **"Table Editor"** in the left sidebar
4. Look for a table named: **`Water Meter (Monthly)`**

### If Table EXISTS:
- ✅ **You're good to go!** No SQL needed
- Skip to "Step 3: Verify Data"

### If Table DOESN'T EXIST:
- ⚠️ **You need to create it**
- Continue to "Step 2: Create Table"

---

## Step 2: Create Table (If Needed)

### Option A: Create Table with SQL Editor

1. In Supabase Dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste this SQL script:

```sql
-- Create Water Meter (Monthly) table
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
) tablespace pg_default;

-- Add comment to table
comment on table public."Water Meter (Monthly)" is 'Monthly water meter readings and metadata';

-- Disable Row Level Security for testing (IMPORTANT!)
alter table public."Water Meter (Monthly)" disable row level security;
```

4. Click **"Run"** button
5. You should see: "Success. No rows returned"

### Option B: Create Table via Table Editor

1. Click **"Table Editor"** → **"New table"**
2. Name: `Water Meter (Monthly)` (include parentheses and space)
3. Add these columns:

| Column Name   | Type    | Default | Nullable |
|---------------|---------|---------|----------|
| Meter Label   | text    | -       | Yes      |
| Acct #        | text    | -       | Yes      |
| Label         | text    | -       | Yes      |
| Zone          | text    | -       | Yes      |
| Parent Meter  | text    | -       | Yes      |
| Type          | text    | -       | Yes      |
| Jan-25        | int8    | -       | Yes      |
| Feb-25        | int8    | -       | Yes      |
| Mar-25        | int8    | -       | Yes      |
| Apr-25        | int8    | -       | Yes      |
| May-25        | int8    | -       | Yes      |
| Jun-25        | int8    | -       | Yes      |
| Jul-25        | int8    | -       | Yes      |
| Aug-25        | int8    | -       | Yes      |
| Sep-25        | int8    | -       | Yes      |

4. **Uncheck** "Enable Row Level Security (RLS)" for now
5. Click **"Save"**

---

## Step 3: Verify Data

### Check if Table Has Data

1. Go to **"Table Editor"**
2. Click on **`Water Meter (Monthly)`** table
3. Check if you see any rows

### If Table is EMPTY:
You need to add your water meter data. See "Step 4: Add Sample Data"

### If Table Has Data:
✅ You're ready to use the app!

---

## Step 4: Add Sample Data (If Table is Empty)

### Option A: Import from CSV/Excel

1. Prepare your Excel/CSV file with these columns:
   - Meter Label
   - Acct #
   - Label
   - Zone
   - Parent Meter
   - Type
   - Jan-25, Feb-25, Mar-25, Apr-25, May-25, Jun-25, Jul-25, Aug-25, Sep-25

2. In Supabase Table Editor, click **"Insert"** → **"Import data via CSV"**
3. Upload your file
4. Map columns correctly
5. Click **"Import"**

### Option B: Add Sample Row via SQL

```sql
-- Insert a sample meter record
insert into public."Water Meter (Monthly)" (
  "Meter Label",
  "Acct #",
  "Label",
  "Zone",
  "Parent Meter",
  "Type",
  "Jan-25",
  "Feb-25",
  "Mar-25",
  "Apr-25",
  "May-25",
  "Jun-25",
  "Jul-25",
  "Aug-25",
  "Sep-25"
) values (
  'Main Source A1',
  '1001',
  'A1',
  'Main Bulk',
  null,
  'Main Source',
  32580,
  44043,
  34915,
  46039,
  58425,
  41840,
  41475,
  41743,
  0
);

-- Insert a zone bulk meter (L2)
insert into public."Water Meter (Monthly)" (
  "Meter Label",
  "Acct #",
  "Label",
  "Zone",
  "Parent Meter",
  "Type",
  "Jan-25",
  "Feb-25",
  "Mar-25",
  "Apr-25",
  "May-25",
  "Jun-25",
  "Jul-25",
  "Aug-25",
  "Sep-25"
) values (
  'Zone 01 Bulk',
  '2001',
  'A3',
  'Zone_01_(FM)',
  'Main Source A1',
  'Zone Infrastructure',
  25000,
  28000,
  26500,
  30000,
  35000,
  27000,
  28500,
  29000,
  0
);

-- Insert an individual meter (L3)
insert into public."Water Meter (Monthly)" (
  "Meter Label",
  "Acct #",
  "Label",
  "Zone",
  "Parent Meter",
  "Type",
  "Jan-25",
  "Feb-25",
  "Mar-25",
  "Apr-25",
  "May-25",
  "Jun-25",
  "Jul-25",
  "Aug-25",
  "Sep-25"
) values (
  'Villa Z3-42',
  '3001',
  'L3',
  'Zone_03_(A)',
  'Zone 03 Bulk',
  'Residential (Villa)',
  150,
  180,
  165,
  200,
  250,
  190,
  175,
  185,
  0
);
```

### Option C: Insert Rows Manually via Table Editor

1. Click on **`Water Meter (Monthly)`** table
2. Click **"Insert row"** button
3. Fill in the values for each column
4. Click **"Save"**
5. Repeat for all your meters

---

## Step 5: Important Security Settings

⚠️ **CRITICAL: Disable Row Level Security (RLS) for Testing**

If your app can't read data, you might need to disable RLS temporarily:

```sql
-- Disable RLS on the table
alter table public."Water Meter (Monthly)" disable row level security;
```

**For Production:** You should enable RLS and create proper policies:

```sql
-- Enable RLS (for production)
alter table public."Water Meter (Monthly)" enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
on public."Water Meter (Monthly)"
for select
to anon
using (true);
```

---

## Step 6: Test the Connection

### Method 1: Via Your Frontend App

1. Start your app: `npm run dev`
2. Open the app in your browser
3. Navigate to **"Water System"**
4. Open browser console (F12)
5. Look for these messages:
   ```
   ✅ Successfully connected to Supabase!
   📊 Found X water meters
   ```

### Method 2: Via Supabase SQL Editor

```sql
-- Test query to see if data exists
select count(*) as total_meters
from public."Water Meter (Monthly)";

-- View sample data
select *
from public."Water Meter (Monthly)"
limit 5;
```

---

## Common Issues and Solutions

### Issue 1: "relation does not exist"
**Solution:** Table name must be **EXACTLY** `Water Meter (Monthly)` with:
- Quotes around the name
- Parentheses: `(Monthly)`
- Space before parentheses
- Capital letters: `Water` and `Meter` and `Monthly`

### Issue 2: "permission denied for table"
**Solution:** Disable Row Level Security:
```sql
alter table public."Water Meter (Monthly)" disable row level security;
```

### Issue 3: "No rows returned" but table has data
**Solution:** Check if RLS is blocking access. Run:
```sql
select * from public."Water Meter (Monthly)";
```
If this works in SQL editor but not in app, RLS is the issue.

### Issue 4: App shows "Loading..." forever
**Solution:** Check browser console for errors. Common causes:
- Wrong Supabase URL
- Wrong anon key
- Table doesn't exist
- Network issues

---

## Quick Checklist

Before running your app, ensure:

- [ ] Supabase project is active (not paused)
- [ ] Table `"Water Meter (Monthly)"` exists
- [ ] Table has at least some data rows
- [ ] Row Level Security (RLS) is **disabled** for testing
- [ ] Supabase credentials in `src/lib/supabaseClient.js` are correct
- [ ] Table columns match the schema exactly

---

## Need Help?

1. Check Supabase Dashboard → Logs → API Logs
2. Check browser console for error messages
3. Verify table name matches exactly (case-sensitive!)
4. Make sure Supabase project is not paused

---

**Last Updated:** October 22, 2025
