import { Router } from 'express';
import { uploadJsonFile } from '../utils/fileUpload';
import { checkAuthToken } from '../middleware/auth';
import BigQueryController from '../controllers/BigQueryController';

const router = Router();

// Create a new BigQuery connection (requires tenant validation)
router.post(
  '/connections',
  checkAuthToken({ requireTenant: true }),
  uploadJsonFile.single('credentials'),
  BigQueryController.createConnection
);

// Validate a BigQuery connection (requires source connection)
router.post(
  '/connections/validate',
  checkAuthToken({ requireSource: true }),
  BigQueryController.validateConnection
);

// List datasets in a BigQuery connection (requires source connection)
router.get(
  '/datasets',
  checkAuthToken({ requireSource: true }),
  BigQueryController.listDatasets
);

// List tables in a BigQuery dataset (requires source connection)
router.get(
  '/datasets/:datasetId/tables',
  checkAuthToken({ requireSource: true }),
  BigQueryController.listTables
);

// Get table schema (requires source connection)
router.get(
  '/datasets/:datasetId/tables/:tableId/schema',
  checkAuthToken({ requireSource: true }),
  BigQueryController.getTableSchema
);

// Execute a query (requires source connection)
router.post(
  '/query',
  checkAuthToken({ requireSource: true }),
  BigQueryController.executeQuery
);

// Get schemas from specific datasets (requires source connection)
router.post(
  '/schemas',
  checkAuthToken({ requireSource: true }),
  BigQueryController.getSchemasFromDatasets
);

export default router;
