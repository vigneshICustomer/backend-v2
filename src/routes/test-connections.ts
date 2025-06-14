import { Router } from 'express';
import { connections } from '../db/schema/connections';
import { db } from '../db/connection';

const router = Router();

// Test endpoint to debug connections table
router.get('/test-connections', async (req, res) => {
  try {
    console.log('Testing connections table...');
    console.log('Connections table object:', connections);
    console.log('Connections table keys:', Object.keys(connections));
    console.log('Connections table columns:', connections ? connections._.columns : 'no columns');
    
    // Try a simple select
    const result = await db.select().from(connections).limit(1);
    console.log('Select result:', result);
    
    res.json({
      status: 'success',
      message: 'Connections table test',
      tableKeys: Object.keys(connections),
      hasColumns: !!connections._.columns,
      selectResult: result
    });
  } catch (error: any) {
    console.error('Test error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
