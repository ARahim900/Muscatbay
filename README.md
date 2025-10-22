# Facility Management System

A comprehensive facility management application for monitoring and managing water systems, electricity, HVAC, firefighting equipment, and contractor operations.

## Features

- **Water System Monitoring** - Track monthly water consumption and daily water readings with detailed analytics
- **Electricity System Tracking** - Monitor electrical meters and consumption patterns
- **HVAC Maintenance Management** - Manage HVAC equipment maintenance logs and schedules
- **Firefighting Equipment Monitoring** - Track firefighting and alarm system equipment status
- **Contractor & Contract Management** - Manage contractors and their contracts
- **STP Plant Operations** - Monitor Sewage Treatment Plant operations and maintenance
- **AI Assistant Integration** - AI-powered assistant for facility management queries

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Backend Integration

This application is connected to Supabase for backend data management.

### Supabase Configuration

The Supabase client is configured in `src/lib/supabaseClient.js` with the following connection details:
- **Project URL**: `https://mtkgpoeaukfmndncfxts.supabase.co`
- **Project ID**: `mtkgpoeaukfmndncfxts`

### Connected Entities

#### Water Meter (Monthly)
✅ **Connected to Supabase**
- **Table**: `Water Meter (Monthly)`
- **Entity**: `WaterMeter` in `src/lib/entities.js`
- **Features**:
  - Fetches all water meter data with monthly readings (Jan-25 to Sep-25)
  - Automatically maps Supabase columns to frontend format
  - Determines meter hierarchy level (L1, L2, L3, L4, DC) based on label
  - Supports filtering by zone, type, and level
  - Provides consumption analytics and trends

**Column Mapping**:
- `Meter Label` → `meter_label`
- `Acct #` → `account_number`
- `Label` → `label` (used for level determination)
- `Zone` → `zone`
- `Parent Meter` → `parent_meter`
- `Type` → `meter_type`
- Monthly readings: `Jan-25`, `Feb-25`, `Mar-25`, `Apr-25`, `May-25`, `Jun-25`, `Jul-25`, `Aug-25`, `Sep-25`

### Entity Operations

Database entity operations are located in `src/lib/entities.js`. Each entity provides standard CRUD methods:

- `list()` - Fetch all records
- `find(id)` - Fetch a single record by ID
- `create(data)` - Create a new record
- `update(id, data)` - Update an existing record
- `delete(id)` - Delete a record

#### Entities Status:
- ✅ **WaterMeter** - Connected to Supabase `Water Meter (Monthly)` table
- ⏳ **DailyWaterReading** - Stub (ready for connection)
- ⏳ **Contractor** - Stub (ready for connection)
- ⏳ **Contract** - Stub (ready for connection)
- ⏳ **Meter** (Electricity) - Stub (ready for connection)
- ⏳ **HvacMaintenanceLog** - Stub (ready for connection)
- ⏳ **FireSafetyEquipment** - Stub (ready for connection)
- ⏳ **STPOperation** - Stub (ready for connection)
- ⏳ **MaintenanceSchedule** - Stub (ready for connection)
- ⏳ **MaintenanceHistory** - Stub (ready for connection)
- ⏳ **System** - Stub (ready for connection)
- ⏳ **Alert** - Stub (ready for connection)

### Integration Services

External service integrations are located in `src/lib/integrations.js`. Available integrations include:

- `InvokeLLM` - AI/LLM integration
- `SendEmail` - Email service
- `UploadFile` - File upload service
- `GenerateImage` - Image generation
- `ExtractDataFromUploadedFile` - Document processing
- `CreateFileSignedUrl` - Secure file URL generation
- `UploadPrivateFile` - Private file storage

Implement your custom service logic in these files to connect to your preferred services.

### Development Notes

- Console warnings will appear when stub methods are called, indicating where custom implementation is needed
- All UI components and layouts are fully functional and ready to use
- The application will build and run successfully with stub implementations
- Replace stub methods incrementally as you implement your backend