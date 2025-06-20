import { Router } from 'express';
import { uploadJsonFile } from '../utils/fileUpload';
import { validateTenant } from '../middleware/auth';
import { lookupBigQueryConnection } from '../middleware/connectionLookup';
import BigQueryController from '../controllers/BigQueryController';

const router = Router();

// Apply tenant validation middleware to all routes
router.use(validateTenant);

// Create a new BigQuery connection
router.post(
  '/connections',
  uploadJsonFile.single('credentials'),
  BigQueryController.createConnection
);

// Apply connection lookup middleware to routes that need connection ID
router.use(lookupBigQueryConnection);

// Validate a BigQuery connection
router.post(
  '/connections/validate',
  BigQueryController.validateConnection
);

// List datasets in a BigQuery connection
router.get(
  '/datasets',
  BigQueryController.listDatasets
);

// List tables in a BigQuery dataset
router.get(
  '/datasets/:datasetId/tables',
  BigQueryController.listTables
);

// Get table schema
router.get(
  '/datasets/:datasetId/tables/:tableId/schema',
  BigQueryController.getTableSchema
);

// Execute a query
router.post(
  '/query',
  BigQueryController.executeQuery
);

// Get schemas from specific datasets
router.post(
  '/schemas',
  BigQueryController.getSchemasFromDatasets
);

export default router;
