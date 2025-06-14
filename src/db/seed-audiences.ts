import { db } from './connection';
import { objects, relationships } from './schema/audiences';

/**
 * Seed script for audience objects and relationships
 * This should be run once to populate the initial data
 */
export async function seedAudienceData() {
  try {
    console.log('Seeding audience objects and relationships...');

    // Seed objects - these represent actual BigQuery tables/datasets
    // Dataset: icustomer, Tables: unified_account, unified_contact
    const objectsData = [
      {
        name: 'unified_account',
        displayName: 'Companies',
        description: 'Unified company/account data from various sources (BigQuery: icustomer.unified_account)',
        bigqueryTable: 'icustomer.unified_account',
      },
      {
        name: 'unified_contact',
        displayName: 'Contacts',
        description: 'Unified contact/person data from various sources (BigQuery: icustomer.unified_contact)',
        bigqueryTable: 'icustomer.unified_contact',
      },
    ];

    // Insert objects (using ON CONFLICT DO NOTHING to avoid duplicates)
    for (const objectData of objectsData) {
      await db.insert(objects).values(objectData).onConflictDoNothing();
    }

    // Get the inserted objects to use their IDs for relationships
    const insertedObjects = await db.select().from(objects);
    const objectMap = insertedObjects.reduce((map, obj) => {
      map[obj.name] = obj.id;
      return map;
    }, {} as Record<string, number>);

    // Seed relationships - define how the BigQuery tables can be joined
    const relationshipsData = [
      {
        fromObjectId: objectMap['unified_contact'],
        toObjectId: objectMap['unified_account'],
        joinCondition: 'c.account_id = a.id',
        description: 'Contacts belong to accounts/companies',
      },
    ];

    // Insert relationships (using ON CONFLICT DO NOTHING to avoid duplicates)
    for (const relationshipData of relationshipsData) {
      if (relationshipData.fromObjectId && relationshipData.toObjectId) {
        await db.insert(relationships).values(relationshipData).onConflictDoNothing();
      }
    }

    console.log('✅ Audience data seeded successfully');
    console.log(`📊 Objects: ${objectsData.length}`);
    console.log(`🔗 Relationships: ${relationshipsData.length}`);

  } catch (error) {
    console.error('❌ Error seeding audience data:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedAudienceData()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
