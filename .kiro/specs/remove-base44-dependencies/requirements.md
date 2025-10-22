# Requirements Document

## Introduction

This document outlines the requirements for removing all Base44 backend dependencies and configurations from the application. The system currently uses the Base44 SDK for database operations, authentication, and integrations. The goal is to completely decouple the application from Base44, preparing it for a custom database backend implementation while maintaining the existing UI and component structure.

## Glossary

- **Base44**: A third-party backend-as-a-service platform that provides database, authentication, and integration services
- **Base44 SDK**: The npm package `@base44/sdk` used to interact with Base44 services
- **Application**: The React-based Vite application that currently depends on Base44
- **Entity Module**: The module at `src/lib/entities.js` that exports Base44 entity references
- **Integration Module**: The module at `src/lib/integrations.js` that exports Base44 integration references
- **Client Module**: The module at `src/lib/base44Client.js` that initializes the Base44 SDK client
- **Page Components**: React components in `src/pages/` that consume Base44 entities for data operations

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove the Base44 SDK dependency from the project, so that the application no longer has any Base44 package dependencies

#### Acceptance Criteria

1. THE Application SHALL remove the `@base44/sdk` package from package.json dependencies
2. THE Application SHALL remove all npm lock file references to `@base44/sdk`
3. THE Application SHALL update the package name from "base44-app" to a generic application name
4. THE Application SHALL remove Base44 branding from the README.md file
5. THE Application SHALL update the HTML title and favicon to remove Base44 references

### Requirement 2

**User Story:** As a developer, I want to remove all Base44 client initialization code, so that the application has no Base44 connection configuration

#### Acceptance Criteria

1. THE Application SHALL delete the `src/lib/base44Client.js` file
2. THE Application SHALL remove all imports of `base44Client` from other modules
3. THE Application SHALL remove the Base44 appId configuration value from the codebase

### Requirement 3

**User Story:** As a developer, I want to remove Base44 entity exports, so that page components no longer reference Base44 data models

#### Acceptance Criteria

1. THE Application SHALL delete or stub out the `src/lib/entities.js` file
2. THE Application SHALL ensure no page components import from `@/lib/entities` without breaking the build
3. THE Application SHALL preserve the entity names (System, Alert, Contractor, Meter, Contract, STPOperation, WaterMeter, FireSafetyEquipment, HvacMaintenanceLog, DailyWaterReading, MaintenanceSchedule, MaintenanceHistory, User) as placeholders for future custom implementation

### Requirement 4

**User Story:** As a developer, I want to remove Base44 integration exports, so that the application has no references to Base44 service integrations

#### Acceptance Criteria

1. THE Application SHALL delete or stub out the `src/lib/integrations.js` file
2. THE Application SHALL remove all Base44 integration references (Core, InvokeLLM, SendEmail, UploadFile, GenerateImage, ExtractDataFromUploadedFile, CreateFileSignedUrl, UploadPrivateFile)
3. THE Application SHALL ensure no components import from `@/lib/integrations` without breaking the build

### Requirement 5

**User Story:** As a developer, I want to update page components to remove Base44 data fetching, so that the application can compile without Base44 SDK calls

#### Acceptance Criteria

1. WHEN a page component imports Base44 entities, THE Application SHALL update the component to use placeholder or stub implementations
2. THE Application SHALL remove all Base44 SDK method calls (e.g., `.find()`, `.create()`, `.update()`, `.delete()`) from page components
3. THE Application SHALL preserve the UI structure and component hierarchy in all page components
4. THE Application SHALL ensure the application builds successfully without runtime errors related to Base44

### Requirement 6

**User Story:** As a developer, I want to remove Base44 branding and external references, so that the application is fully decoupled from Base44 services

#### Acceptance Criteria

1. THE Application SHALL remove the Base44 logo URL from index.html
2. THE Application SHALL remove the Base44 logo image URL from Layout.jsx
3. THE Application SHALL update the application title from "Base44 APP" to a generic title
4. THE Application SHALL remove Base44 support contact information from README.md
5. THE Application SHALL update README.md to reflect that this is a standalone application
