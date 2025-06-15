import { db } from './connection';
import { sql } from 'drizzle-orm';

/**
 * Migration script to create audience tables in the audience_hub schema
 * This creates the physical tables based on our Drizzle schema definitions
 */
export async function migrateAudienceTables() {
  try {
    console.log('🚀 Creating audience tables in audience_hub schema...');

    // Create the audience_hub schema if it doesn't exist
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS audience_hub`);
    console.log('✅ Schema audience_hub created/verified');

    // Create objects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audience_hub.objects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(64) NOT NULL UNIQUE,
        display_name VARCHAR(128) NOT NULL,
        description TEXT,
        bigquery_table VARCHAR(256),
        fields JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audience_hub.objects created');

    // Create relationships table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audience_hub.relationships (
        id SERIAL PRIMARY KEY,
        from_object_id INTEGER NOT NULL REFERENCES audience_hub.objects(id),
        to_object_id INTEGER NOT NULL REFERENCES audience_hub.objects(id),
        join_condition VARCHAR(256) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audience_hub.relationships created');

    // Create audiences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audience_hub.audiences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audience_hub.audiences created');

    // Create audience_objects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audience_hub.audience_objects (
        id SERIAL PRIMARY KEY,
        audience_id UUID NOT NULL REFERENCES audience_hub.audiences(id) ON DELETE CASCADE,
        object_id INTEGER NOT NULL REFERENCES audience_hub.objects(id),
        alias VARCHAR(8) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audience_hub.audience_objects created');

    // Create cohorts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audience_hub.cohorts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        audience_id UUID NOT NULL REFERENCES audience_hub.audiences(id) ON DELETE CASCADE,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        filters JSONB NOT NULL DEFAULT '{"companyFilters": [], "contactFilters": []}',
        company_count INTEGER DEFAULT 0,
        people_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        last_processed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table audience_hub.cohorts created');

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audiences_tenant_id ON audience_hub.audiences(tenant_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cohorts_audience_id ON audience_hub.cohorts(audience_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cohorts_tenant_id ON audience_hub.cohorts(tenant_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audience_objects_audience_id ON audience_hub.audience_objects(audience_id)
    `);

    console.log('✅ Indexes created');

    console.log('🎉 All audience tables created successfully in audience_hub schema!');
    
    // List the created tables
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'audience_hub'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Created tables:');
    if (tablesResult.rows) {
      tablesResult.rows.forEach((table: any) => {
        console.log(`   - audience_hub.${table.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating audience tables:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAudienceTables()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      console.log('📝 Next step: Run the seed script to populate initial data');
      console.log('   npm run ts-node src/db/seed-audiences.ts');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
