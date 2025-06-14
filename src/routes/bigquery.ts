import { Router } from 'express';
import { uploadJsonFile } from '../utils/fileUpload';
import { validateTenant } from '../middleware/auth';
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

// Validate a BigQuery connection
router.post(
  '/connections/:id/validate',
  BigQueryController.validateConnection
);

// List datasets in a BigQuery connection
router.get(
  '/connections/:id/datasets',
  BigQueryController.listDatasets
);

// List tables in a BigQuery dataset
router.get(
  '/connections/:id/datasets/:datasetId/tables',
  BigQueryController.listTables
);

// Get table schema
router.get(
  '/connections/:id/datasets/:datasetId/tables/:tableId/schema',
  BigQueryController.getTableSchema
);

// Execute a query
router.post(
  '/connections/:id/query',
  BigQueryController.executeQuery
);

export default router;
