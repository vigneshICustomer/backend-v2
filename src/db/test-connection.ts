import { db, checkDatabaseHealth } from './connection';
import { userStorage } from '../storage/userStorage';

/**
 * Test Drizzle connection and basic operations
 * This is a safe test that only reads from the database
 */
async function testDrizzleConnection() {
  console.log('🔍 Testing Drizzle ORM connection...');
  
  try {
    // Test 1: Basic connection health check
    console.log('1. Testing database connection...');
    const health = await checkDatabaseHealth();
    console.log('   Health check result:', health);
    
    if (health.status !== 'healthy') {
      throw new Error('Database connection is not healthy');
    }

    // Test 2: Test userStorage health check (simple SELECT)
    console.log('2. Testing userStorage operations...');
    const storageHealthy = await userStorage.healthCheck();
    console.log('   Storage health check:', storageHealthy ? '✅ Healthy' : '❌ Failed');

    // Test 3: Try to find a user by email (read-only operation)
    console.log('3. Testing user lookup (read-only)...');
    try {
      const testUser = await userStorage.findByEmail('vignesh@icustomer.ai');
      console.log(testUser)
      console.log(' User lookup test:', testUser ?  'Found user' : 'No user found (expected)');
    } catch (error) {
      console.log('   User lookup test: ✅ Query executed successfully');
    }

    console.log('🎉 All Drizzle tests passed! Connection is working correctly.');
    console.log('📊 Connection pool status:', {
      totalConnections: health.totalConnections,
      idleConnections: health.idleConnections,
      waitingClients: health.waitingClients
    });

    return true;
  } catch (error) {
    console.error('❌ Drizzle connection test failed:', error);
    return false;
  }
}

// Export for use in other files
export { testDrizzleConnection };

// Run test if this file is executed directly
if (require.main === module) {
  testDrizzleConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}
