# Audience & Cohorts API Testing Guide

This guide provides step-by-step instructions for testing the migrated Audience and Cohorts API using the provided Postman collection.

## Prerequisites

### 1. Import Postman Collection
1. Open Postman
2. Click "Import" 
3. Select the `Audience-Cohorts-API.postman_collection.json` file
4. The collection will be imported with all endpoints and examples

### 2. Environment Setup
The collection includes these variables:
- `baseUrl`: Set to `http://localhost:3001` (adjust if your server runs on a different port)
- `audienceId`: Will be set after creating an audience
- `cohortId`: Will be set after creating a cohort

### 3. Server Setup
Ensure your backend-v2 server is running:
```bash
cd backend-v2
npm run dev
```

### 4. Database Setup
Run the seed script to populate initial data:
```bash
cd backend-v2
npm run ts-node src/db/seed-audiences.ts
```

### 5. BigQuery Connection (Optional for Full Testing)
For full BigQuery integration testing, you'll need:
- A valid BigQuery connection set up in the system
- Update the AudienceService to use a specific connection ID

## Testing Workflow

### Step 1: Health Check
Start by verifying the system is working:

**Request:** `GET /api/audiences/health`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "storage": true,
    "bigquery": false  // Will be false without BigQuery connection
  }
}
```

### Step 2: Get Available Objects (BigQuery Tables)
Verify the seeded data is available:

**Request:** `GET /api/objects`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "unified_accounts",
      "displayName": "Companies",
      "description": "Unified company/account data from various sources (BigQuery table: unified_accounts)",
      "bigqueryTable": "unified_accounts"
    },
    {
      "id": 2,
      "name": "unified_contacts",
      "displayName": "Contacts",
      "description": "Unified contact/person data from various sources (BigQuery table: unified_contacts)",
      "bigqueryTable": "unified_contacts"
    }
    // ... more objects
  ],
  "count": 5
}
```

### Step 3: Get Available Relationships
Check the relationships between BigQuery tables:

**Request:** `GET /api/relationships`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fromObjectId": 2,
      "toObjectId": 1,
      "joinCondition": "c.account_id = a.id",
      "description": "Contacts belong to accounts/companies"
    }
    // ... more relationships
  ],
  "count": 6
}
```

### Step 4: Create an Audience
Create an audience that combines BigQuery tables:

**Request:** `POST /api/audiences`

**Body:**
```json
{
  "name": "Sales Target Audience",
  "description": "Companies and contacts for sales targeting",
  "tenantId": "tenant_123",
  "createdBy": "user_456",
  "objects": [
    {
      "objectId": 1,
      "alias": "a"
    },
    {
      "objectId": 2,
      "alias": "c"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "audience": {
      "id": "aud_123...",
      "name": "Sales Target Audience",
      "description": "Companies and contacts for sales targeting",
      "tenantId": "tenant_123",
      "createdBy": "user_456",
      "createdAt": "2024-06-15T...",
      "updatedAt": "2024-06-15T..."
    },
    "objects": [
      {
        "id": "ao_123...",
        "audienceId": "aud_123...",
        "objectId": 1,
        "alias": "a"
      },
      {
        "id": "ao_456...",
        "audienceId": "aud_123...",
        "objectId": 2,
        "alias": "c"
      }
    ]
  },
  "message": "Audience created successfully"
}
```

**Important:** Copy the `audience.id` value and set it as the `audienceId` variable in Postman.

### Step 5: Get Audience Details
Verify the audience was created with proper relationships:

**Request:** `GET /api/audiences/{{audienceId}}/details`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "audience": {
      "id": "aud_123...",
      "name": "Sales Target Audience",
      // ... audience details
    },
    "objects": [
      {
        "id": "ao_123...",
        "audienceId": "aud_123...",
        "objectId": 1,
        "alias": "a",
        "object": {
          "id": 1,
          "name": "unified_accounts",
          "displayName": "Companies",
          // ... object details
        }
      }
      // ... more objects
    ],
    "availableRelationships": [
      {
        "id": 1,
        "fromObjectId": 2,
        "toObjectId": 1,
        "joinCondition": "c.account_id = a.id",
        "description": "Contacts belong to accounts/companies"
      }
    ]
  }
}
```

### Step 6: Create a Cohort
Create a cohort with filters that will generate BigQuery SQL:

**Request:** `POST /api/cohorts`

**Body:**
```json
{
  "name": "US Directors Cohort",
  "description": "Directors in US companies",
  "audienceId": "{{audienceId}}",
  "tenantId": "tenant_123",
  "createdBy": "user_456",
  "companyFilters": [
    {
      "id": "filter_1",
      "category": "company_properties",
      "field": "Account_country",
      "operator": "equals",
      "value": "USA",
      "logicalOperator": "AND"
    },
    {
      "id": "filter_2",
      "category": "company_properties",
      "field": "Account_size",
      "operator": "greater_than",
      "value": 100,
      "logicalOperator": "AND"
    }
  ],
  "contactFilters": [
    {
      "id": "filter_3",
      "category": "contact_properties",
      "field": "job_title",
      "operator": "contains",
      "value": "Director",
      "logicalOperator": "AND"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "coh_123...",
    "audienceId": "aud_123...",
    "name": "US Directors Cohort",
    "description": "Directors in US companies",
    "tenantId": "tenant_123",
    "createdBy": "user_456",
    "filters": {
      "companyFilters": [
        {
          "id": "filter_1",
          "category": "company_properties",
          "field": "Account_country",
          "operator": "equals",
          "value": "USA",
          "logicalOperator": "AND"
        }
        // ... more filters
      ],
      "contactFilters": [
        {
          "id": "filter_3",
          "category": "contact_properties",
          "field": "job_title",
          "operator": "contains",
          "value": "Director",
          "logicalOperator": "AND"
        }
      ]
    },
    "status": "processing",
    "companyCount": null,
    "peopleCount": null,
    "createdAt": "2024-06-15T...",
    "updatedAt": "2024-06-15T..."
  },
  "message": "Cohort created successfully"
}
```

**Important:** Copy the `id` value and set it as the `cohortId` variable in Postman.

### Step 7: Generate Cohort SQL
See the SQL that would be generated for BigQuery:

**Request:** `GET /api/cohorts/{{cohortId}}/sql`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sql": "\n      SELECT \n        c.id as contact_id,\n        c.first_name,\n        c.last_name,\n        c.email,\n        c.job_title,\n        c.account_id,\n        a.id as account_id,\n        a.company_name,\n        a.industry,\n        a.country,\n        a.employee_count\n      FROM `{project}.{dataset}.unified_contacts` c\n      JOIN `{project}.{dataset}.unified_accounts` a \n        ON c.account_id = a.id\n WHERE ((a.country = 'USA' AND a.employee_count > 100)) AND ((c.job_title LIKE '%Director%'))"
  }
}
```

### Step 8: Test Backward Compatibility
Test the legacy filter format:

**Request:** `POST /api/cohorts` (using the "Create Cohort (Legacy Format)" request)

This should work with the old `filters` and `peopleFilters` format.

### Step 9: List Operations
Test various listing operations:

1. **Get Audiences by Tenant:** `GET /api/audiences?tenantId=tenant_123`
2. **Get Cohorts by Tenant:** `GET /api/cohorts?tenantId=tenant_123`
3. **Get Cohorts by Audience:** `GET /api/cohorts?audienceId={{audienceId}}`

### Step 10: Data Operations (Requires BigQuery Connection)
These operations require a valid BigQuery connection:

1. **Preview Cohort Data:** `GET /api/cohorts/{{cohortId}}/preview?limit=50`
2. **Get Cohort Counts:** `GET /api/cohorts/{{cohortId}}/counts`
3. **Download Cohort Data:** `GET /api/cohorts/{{cohortId}}/download`

**Note:** Without a BigQuery connection, these will return errors about missing connection ID.

## Testing with BigQuery Connection

To test the full BigQuery integration:

### 1. Set up BigQuery Connection
First, create a BigQuery connection using the existing BigQuery API:

```bash
# Use the existing BigQuery connection endpoints
POST /api/bigquery/connections
```

### 2. Configure AudienceService
Update your AudienceService to use the connection:

```typescript
// In your application startup or configuration
const audienceService = new AudienceService();
audienceService.setBigQueryConnectionId('your-connection-id');
```

### 3. Test Data Operations
Once configured, the data operations should work:

- Preview will return actual BigQuery data
- Counts will return real numbers
- Download will provide full datasets

## Error Testing

Test error scenarios:

1. **Invalid Audience ID:** Use a non-existent audience ID
2. **Invalid Cohort ID:** Use a non-existent cohort ID
3. **Missing Required Fields:** Try creating audiences/cohorts without required fields
4. **Invalid Tenant ID:** Use invalid tenant IDs

## Expected Error Responses

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Audience not found"
  }
}
```

## Performance Testing

1. **Create Multiple Audiences:** Test with various object combinations
2. **Create Multiple Cohorts:** Test with complex filter combinations
3. **Large Filter Sets:** Test with many filters to verify SQL generation
4. **Concurrent Requests:** Test multiple simultaneous requests

## Troubleshooting

### Common Issues

1. **Server Not Running:** Ensure backend-v2 server is running on the correct port
2. **Database Not Seeded:** Run the seed script if objects are empty
3. **BigQuery Errors:** Check BigQuery connection configuration
4. **Variable Not Set:** Ensure audienceId and cohortId variables are set in Postman

### Debug Endpoints

Use these for debugging:
- Health check: `/api/audiences/health`
- Objects list: `/api/objects`
- Relationships list: `/api/relationships`

## Next Steps

After successful testing:

1. **Integration Testing:** Test with real BigQuery data
2. **Performance Testing:** Test with large datasets
3. **UI Integration:** Connect the frontend to the new API
4. **Production Deployment:** Deploy to production environment

This testing guide ensures comprehensive validation of the migrated Audience and Cohorts functionality.
