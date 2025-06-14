# Audience & Cohorts Backend Migration

This document describes the migration of the Audience and Cohorts functionality from the demo API routes to a production-ready backend using Drizzle ORM, BigQuery integration, and a decoupled architecture.

## Architecture Overview

The new backend follows a layered architecture:

```
┌─────────────────┐
│   API Routes    │ ← Express routes (/api/audiences, /api/cohorts)
├─────────────────┤
│   Controllers   │ ← Request/response handling, validation
├─────────────────┤
│    Services     │ ← Business logic, orchestration
├─────────────────┤
│    Storage      │ ← Database operations (Drizzle ORM)
├─────────────────┤
│  BigQuery API   │ ← Data querying from BigQuery
└─────────────────┘
```

## Key Components

### 1. Database Schema (`src/db/schema/audiences.ts`)

- **objects**: Available BigQuery tables/datasets (unified_accounts, unified_contacts, etc.) - these represent the actual data tables in BigQuery
- **relationships**: How BigQuery tables can be joined (e.g., contacts.account_id = accounts.id)
- **audiences**: Saved data models connecting multiple BigQuery tables
- **audience_objects**: Which BigQuery tables are included in each audience with their aliases
- **cohorts**: Filtered subsets of audiences with JSON-stored filters that generate SQL queries against BigQuery

### 2. Storage Layer (`src/storage/audienceStorage.ts`)

Following the existing storage pattern, provides CRUD operations for:
- Audiences and audience objects
- Cohorts and cohort management
- Objects and relationships lookup

### 3. Service Layer (`src/services/AudienceService.ts`)

Business logic including:
- Audience creation and management
- Cohort creation with background processing
- BigQuery integration for data retrieval
- Caching and performance optimization

### 4. BigQuery Service (`src/services/AudienceBigQueryService.ts`)

Handles:
- Dynamic SQL generation from filters
- Filter condition building (AND/OR logic)
- Field mapping from UI to BigQuery columns
- Query execution and result processing

### 5. Controller Layer (`src/controllers/audiences/audienceController.ts`)

HTTP request handling:
- Input validation
- Error handling
- Response formatting
- Backward compatibility with existing UI

## API Endpoints

### Audiences
- `POST /api/audiences` - Create audience
- `GET /api/audiences` - List audiences by tenant
- `GET /api/audiences/:id` - Get audience details
- `GET /api/audiences/:id/details` - Get audience with objects and relationships
- `PUT /api/audiences/:id` - Update audience
- `DELETE /api/audiences/:id` - Delete audience

### Cohorts
- `POST /api/cohorts` - Create cohort
- `GET /api/cohorts` - List cohorts by tenant
- `GET /api/cohorts/:id` - Get cohort details
- `GET /api/cohorts/:id/details` - Get cohort with audience details
- `GET /api/cohorts/:id/preview` - Preview cohort data (limit 100)
- `GET /api/cohorts/:id/counts` - Get cohort counts (cached)
- `GET /api/cohorts/:id/download` - Download full cohort data
- `GET /api/cohorts/:id/sql` - Get generated SQL for cohort
- `PUT /api/cohorts/:id` - Update cohort
- `DELETE /api/cohorts/:id` - Delete cohort

### Utilities
- `GET /api/objects` - List available objects
- `GET /api/relationships` - List available relationships
- `GET /api/audiences/health` - Health check

## Filter Structure

Cohorts store filters as JSON with separate arrays for company and contact filters:

```json
{
  "companyFilters": [
    {
      "id": "uuid",
      "category": "company_properties",
      "field": "Account_country",
      "operator": "equals",
      "value": "USA",
      "logicalOperator": "AND"
    }
  ],
  "contactFilters": [
    {
      "id": "uuid",
      "category": "contact_properties", 
      "field": "job_title",
      "operator": "contains",
      "value": "Director",
      "logicalOperator": "AND"
    }
  ]
}
```

## Environment Variables

Add to your `.env` file:

```env
# BigQuery Configuration
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET_ID=your-dataset-id
BIGQUERY_KEY_FILE=path/to/service-account-key.json
```

## Setup Instructions

### 1. Database Migration

The new tables will be created automatically when the server starts. The schema includes:
- objects
- relationships  
- audiences
- audience_objects
- cohorts

### 2. Seed Initial Data

Run the seed script to populate objects and relationships:

```bash
cd backend-v2
npm run ts-node src/db/seed-audiences.ts
```

### 3. BigQuery Setup

1. Create a service account in Google Cloud Console
2. Download the service account key JSON file
3. Set the `BIGQUERY_KEY_FILE` environment variable to the file path
4. Ensure your BigQuery dataset contains the expected tables:
   - `unified_accounts`
   - `unified_contacts`
   - Other tables as configured in objects

### 4. Start the Server

```bash
cd backend-v2
npm run dev
```

The new endpoints will be available at `/api/audiences/*` and `/api/cohorts/*`.

## Migration from Demo API

### Backward Compatibility

The new API maintains backward compatibility with the existing UI:
- Accepts both old format (`filters`, `peopleFilters`) and new format (`companyFilters`, `contactFilters`)
- Returns data in the expected format
- Handles the same field names and operators

### Key Differences

1. **Database**: SQLite/demo DB → PostgreSQL with Drizzle ORM
2. **Data Source**: Mock data → BigQuery
3. **Architecture**: Monolithic routes → Layered architecture
4. **Scalability**: Demo-only → Production-ready
5. **Caching**: None → Intelligent caching of counts
6. **Background Processing**: Synchronous → Asynchronous cohort processing

## Microservice Readiness

The backend is designed for easy extraction as a microservice:

1. **Decoupled Dependencies**: All external dependencies are abstracted
2. **Environment Configuration**: All config via environment variables
3. **Self-contained**: No dependencies on other parts of the application
4. **API-first**: Clean REST API that can be consumed by any client
5. **Database Isolation**: Uses its own schema/tables

To extract as a microservice:
1. Move `backend-v2` to its own repository
2. Set up independent deployment pipeline
3. Configure separate database and BigQuery credentials
4. Update client applications to use the new service URL

## Performance Considerations

1. **Caching**: Cohort counts are cached for 24 hours
2. **Background Processing**: Cohort creation is asynchronous
3. **Query Optimization**: BigQuery queries are optimized with proper indexing
4. **Connection Pooling**: Database connections are pooled
5. **Error Handling**: Comprehensive error handling and logging

## Testing

Health check endpoint: `GET /api/audiences/health`

Returns:
```json
{
  "success": true,
  "data": {
    "storage": true,
    "bigquery": true
  }
}
```

## Future Enhancements

1. **Materialized Views**: Cache cohort results as BigQuery tables
2. **Real-time Updates**: WebSocket support for live cohort updates
3. **Advanced Filtering**: Support for nested filter groups
4. **Data Permissions**: Row-level security based on user permissions
5. **Analytics**: Usage tracking and performance metrics
