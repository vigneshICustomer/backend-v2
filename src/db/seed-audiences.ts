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
        fields: [
          {
            name: 'id',
            displayName: 'Account ID',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: false,
            description: 'Unique identifier for the account'
          },
          {
            name: 'company_name',
            displayName: 'Company Name',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains'],
            hasDistinctValues: true,
            distinctValuesLimit: 100,
            description: 'Name of the company'
          },
          {
            name: 'industry',
            displayName: 'Industry',
            dataType: 'string',
            category: 'firmographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: true,
            distinctValuesLimit: 50,
            description: 'Industry classification'
          },
          {
            name: 'country',
            displayName: 'Country',
            dataType: 'string',
            category: 'firmographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: true,
            distinctValuesLimit: 50,
            description: 'Country where the company is located'
          },
          {
            name: 'employee_count',
            displayName: 'Employee Count',
            dataType: 'number',
            category: 'firmographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
            hasDistinctValues: false,
            description: 'Number of employees in the company'
          },
          {
            name: 'annual_revenue',
            displayName: 'Annual Revenue',
            dataType: 'number',
            category: 'firmographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
            hasDistinctValues: false,
            description: 'Annual revenue of the company'
          },
          {
            name: 'website',
            displayName: 'Website',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains'],
            hasDistinctValues: false,
            description: 'Company website URL'
          }
        ]
      },
      {
        name: 'unified_contact',
        displayName: 'Contacts',
        description: 'Unified contact/person data from various sources (BigQuery: icustomer.unified_contact)',
        bigqueryTable: 'icustomer.unified_contact',
        fields: [
          {
            name: 'id',
            displayName: 'Contact ID',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: false,
            description: 'Unique identifier for the contact'
          },
          {
            name: 'first_name',
            displayName: 'First Name',
            dataType: 'string',
            category: 'demographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains'],
            hasDistinctValues: true,
            distinctValuesLimit: 100,
            description: 'First name of the contact'
          },
          {
            name: 'last_name',
            displayName: 'Last Name',
            dataType: 'string',
            category: 'demographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains'],
            hasDistinctValues: true,
            distinctValuesLimit: 100,
            description: 'Last name of the contact'
          },
          {
            name: 'email',
            displayName: 'Email',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains'],
            hasDistinctValues: false,
            description: 'Email address of the contact'
          },
          {
            name: 'job_title',
            displayName: 'Job Title',
            dataType: 'string',
            category: 'demographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in'],
            hasDistinctValues: true,
            distinctValuesLimit: 100,
            description: 'Job title of the contact'
          },
          {
            name: 'seniority_level',
            displayName: 'Seniority Level',
            dataType: 'string',
            category: 'demographics',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: true,
            distinctValuesLimit: 20,
            description: 'Seniority level (e.g., Junior, Senior, Executive)'
          },
          {
            name: 'account_id',
            displayName: 'Account ID',
            dataType: 'string',
            category: 'properties',
            isFilterable: true,
            isDisplayable: false,
            operators: ['equals', 'not_equals', 'in', 'not_in'],
            hasDistinctValues: false,
            description: 'ID of the associated account/company'
          },
          {
            name: 'email_opens',
            displayName: 'Email Opens',
            dataType: 'number',
            category: 'engagement',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
            hasDistinctValues: false,
            description: 'Number of email opens'
          },
          {
            name: 'email_clicks',
            displayName: 'Email Clicks',
            dataType: 'number',
            category: 'engagement',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
            hasDistinctValues: false,
            description: 'Number of email clicks'
          },
          {
            name: 'website_visits',
            displayName: 'Website Visits',
            dataType: 'number',
            category: 'engagement',
            isFilterable: true,
            isDisplayable: true,
            operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
            hasDistinctValues: false,
            description: 'Number of website visits'
          }
        ]
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
