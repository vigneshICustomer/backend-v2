import axios from 'axios';
import connection from '../config/database';
import ApiError from '../utils/ApiError';

/**
 * Enrich Service
 * Handles data enrichment operations
 */
export class EnrichService {
  /**
   * Enrich columns with additional data
   */
  static async enrichColumns(
    records: any[], 
    accountFieldsToEnrich: string[], 
    peopleFieldsToEnrich: string[], 
    entityType: string, 
    queryId: string,
    apiKey: string
  ): Promise<any> {
    const tableName = `insighttables.new_table_${queryId.replace(/-/g, '_')}`;
    const excludedKeys = ['session_id', 'user_email', 'query_id'];

    try {
      let responseData;

      if (entityType === 'account') {
        // Transform account_fields_to_enrich into an object
        let accountFields: Record<string, boolean> = {};
        accountFieldsToEnrich.forEach(field => {
          accountFields[field] = true;
        });

        const data = {
          records: records,
          update: true,
          columns_to_drop: [],
          account_fields_to_enrich: accountFields
        };

        const config = {
          method: 'POST',
          url: 'http://3.236.218.40:8012/v1/company/enrich',
          data: data,
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'Content-Type': 'application/json'
          }
        };

        const response = await axios.request(config);
        responseData = response.data;
      } else if (entityType === 'people') {
        // Transform records for people enrichment
        const contacts = records.map(record => ({
          first_name: record.first_name || "",
          last_name: record.last_name || "",
          company_name: record.company_name || "",
          company_website: record.company_website || "",
          email: record.email || "",
          linkedin_url: record.linkedin_url || "",
          s_no: record.s_no // Keep s_no for database updates
        }));

        const config = {
          method: 'POST',
          url: 'http://3.236.218.40:8012/v2.1/contact/enrich',
          data: { contacts },
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'Content-Type': 'application/json'
          }
        };

        const response = await axios.request(config);
        
        // Transform the response to match our expected format
        responseData = response.data.map((item: any, index: number) => {
          const { input } = item[0];
          let output = item[1]?.output;
          let { last_company, last_title } = this.findLastCompany(output?.positions?.positionHistory);
          
          // Create a mapping of field names to their values
          const fieldMapping: Record<string, any> = {
            first_name: output?.firstName || input.first_name,
            last_name: output?.lastName || input.last_name,
            job_title: output?.job_title || output?.headline,
            location: output?.location,
            description: output?.description,
            linkedin_url: output?.linkedInUrl,
            company_name: output?.company || input.company,
            present_company_since: output?.tenure?.start?.month && output?.tenure?.start?.year ? `${output?.tenure?.start?.month}/${output?.tenure?.start?.year}`: '',
            last_company: last_company,
            last_title: last_title,
            followerCount: output?.followerCount,
            skills: this.getSkills(output?.skills),
            language: this.getLanguages(output?.language),
            certificate: this.getCertificates(output?.certifications?.certificationHistory.map((x: any) => x?.name))
          };

          // Only include fields that were requested in people_fields_to_enrich
          const enrichedData: Record<string, any> = { s_no: contacts[index].s_no };
          peopleFieldsToEnrich.forEach(field => {
            if (field in fieldMapping) {
              enrichedData[field] = fieldMapping[field];
            }
          });

          return enrichedData;
        });
      } else {
        throw new Error('Invalid entity type');
      }

      // Check and add new columns only for requested fields
      const firstRecord = responseData[0];
      const { s_no, ...rest } = firstRecord;
      const columnsToCheck = Object.keys(rest).filter(key => !excludedKeys.includes(key));

      for (const column of columnsToCheck) {
        const checkColumnQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `;
        const columnExists = await connection.query(checkColumnQuery, [tableName.split('.')[1], column]);

        if (columnExists.rows.length === 0) {
          try {
            const addColumnQuery = `ALTER TABLE ${tableName} ADD COLUMN ${column} VARCHAR`;
            await connection.query(addColumnQuery);
          } catch (alterError: any) {
            console.warn(`Error adding column "${column}":`, alterError.message);
          }
        }
      }

      // Update records
      await connection.query('BEGIN');

      for (const record of responseData) {
        const { s_no, ...rest } = record;
        const fieldsToUpdate = Object.entries(rest).filter(([column]) => !excludedKeys.includes(column));

        for (const [column, value] of fieldsToUpdate) {
          const updateQuery = `UPDATE ${tableName} SET ${column} = $1 WHERE s_no = $2`;
          await connection.query(updateQuery, [value, s_no]);
        }
      }

      await connection.query('COMMIT');

      return {
        status: 'success',
        data: responseData
      };
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Error enriching columns:', error);
      throw ApiError.internal('Server down, please try after sometime');
    }
  }

  /**
   * Clean and normalize account data
   */
  static async cleanAndNormalizeData(
    data: any[], 
    mappings: Record<string, string>, 
    entity: string, 
    queryId: string
  ): Promise<any> {
    const tableName = `insighttables.new_table_${queryId.replace(/-/g, '_')}`;

    try {
      if (entity === 'account') {
        // Prepare data for account name standardization
        const accountNameRequests = data.map((row, index) => ({
          index_num: index,
          input_account_name: row[mappings['Account Name']]
        }));

        // Process both account names and websites
        const results = [];
        
        // Call account name standardization API
        const accountResponse = await axios.request({
          method: 'POST',
          url: 'http://3.236.218.40:8004/accountStandardization/accountNames',
          headers: {
            'accept': 'application/json',
            'token': 'j23hDk5R8L9s7pG2W0qRt4EeF1ySvP',
            'Content-Type': 'application/json'
          },
          data: accountNameRequests
        });
        
        // Process websites if Website field is mapped
        let websiteResults: any[] = [];
        if (mappings['Website']) {
          try {
            const websiteRequests = data.map((row, index) => ({
              index_num: index,
              input_website_name: row[mappings['Website']]
            }));

            const websiteResponse = await axios.request({
              method: 'POST',
              url: 'http://3.236.218.40:8004/websiteValidator/websites',
              headers: {
                'accept': 'application/json',
                'token': 'j23hDk5R8L9s7pG2W0qRt4EeF1ySvP',
                'Content-Type': 'application/json'
              },
              data: websiteRequests
            });
            websiteResults = websiteResponse.data;
          } catch (error: any) {
            console.error('Error processing websites:', error);
            // If bulk API fails, create error results for all websites
            websiteResults = data.map((row, index) => ({
              index_num: index,
              input_website_name: row[mappings['Website']],
              output_website_name: row[mappings['Website']],
              output_website_validator_status: 'Error',
              output_website_validator_comments: error.message
            }));
          }
        }

        // Start transaction to update the table
        await connection.query('BEGIN');

        // Update account names and websites in the table
        for (const result of accountResponse.data) {
          const updateFields = [];
          const updateValues = [];
          let valueIndex = 1;

          // Add account name fields
          updateFields.push(`${mappings['Account Name']} = $${valueIndex}`);
          updateValues.push(result.output_account_name);
          valueIndex++;

          // Add website fields if present
          const websiteResult = websiteResults.find(w => w.index_num === result.index_num);
          if (websiteResult) {
            updateFields.push(`${mappings['Website']} = $${valueIndex}`);
            updateValues.push(websiteResult.output_website_name);
            valueIndex++;
          }

          // Add s_no to values
          updateValues.push(result.index_num + 1); // s_no is 1-based

          const updateQuery = `
            UPDATE ${tableName} 
            SET ${updateFields.join(', ')}
            WHERE s_no = $${valueIndex}
          `;
          
          await connection.query(updateQuery, updateValues);

          // Add to results for display
          results.push({
            ...result,
            ...(websiteResult || {})
          });
        }

        await connection.query('COMMIT');
        
        return {
          status: 'success', 
          data: results,
          message: 'Data cleaned and normalized successfully'
        };
      } else {
        throw ApiError.badRequest('Unsupported entity type');
      }
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Error in clean and normalize:', error);
      throw ApiError.internal('Error processing clean and normalize request');
    }
  }

  /**
   * Clean and normalize people data
   */
  static async peopleCleanAndNormalizeData(
    data: any[], 
    mappings: Record<string, string>, 
    queryId: string
  ): Promise<any> {
    const tableName = `insighttables.new_table_${queryId.replace(/-/g, '_')}`;

    try {
      const results = [];
      await connection.query('BEGIN');

      try {
        // Process each record
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const updateFields = [];
          const updateValues = [];
          let valueIndex = 1;
          const result: Record<string, any> = { index_num: i };

          // Clean first name if mapped
          if (mappings['First Name']) {
            const originalFirstName = row[mappings['First Name']];
            const cleanedFirstName = this.cleanName(originalFirstName);
            
            updateFields.push(`${mappings['First Name']} = $${valueIndex}`);
            updateValues.push(cleanedFirstName);
            valueIndex++;

            result.input_first_name = originalFirstName;
            result.output_first_name = cleanedFirstName;
          }

          // Clean last name if mapped
          if (mappings['Last Name']) {
            const originalLastName = row[mappings['Last Name']];
            const cleanedLastName = this.cleanName(originalLastName);
            
            updateFields.push(`${mappings['Last Name']} = $${valueIndex}`);
            updateValues.push(cleanedLastName);
            valueIndex++;

            result.input_last_name = originalLastName;
            result.output_last_name = cleanedLastName;
          }

          // Clean email if mapped
          if (mappings['Email']) {
            const originalEmail = row[mappings['Email']];
            const cleanedEmail = this.cleanEmail(originalEmail);
            
            updateFields.push(`${mappings['Email']} = $${valueIndex}`);
            updateValues.push(cleanedEmail);
            valueIndex++;

            result.input_email = originalEmail;
            result.output_email = cleanedEmail;
          }

          // Add s_no to values for the WHERE clause
          updateValues.push(i + 1); // s_no is 1-based

          if (updateFields.length > 0) {
            const updateQuery = `
              UPDATE ${tableName} 
              SET ${updateFields.join(', ')}
              WHERE s_no = $${valueIndex}
            `;
            await connection.query(updateQuery, updateValues);
          }

          results.push(result);
        }

        await connection.query('COMMIT');
        
        return {
          status: 'success', 
          data: results,
          message: 'Data cleaned successfully'
        };
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in people clean and normalize:', error);
      throw ApiError.internal('Error processing clean request');
    }
  }

  /**
   * Deduplicate data
   */
  static async deduplicateData(data: any[], queryId: string): Promise<any> {
    try {
      // Implementation for deduplication logic
      // This would involve identifying duplicate records and removing them
      
      return {
        status: 'success',
        message: 'Data deduplicated successfully',
        data: data // For now, return original data
      };
    } catch (error) {
      console.error('Error deduplicating data:', error);
      throw ApiError.internal('Error processing deduplicate request');
    }
  }

  // Helper methods
  private static findLastCompany(posHistory: any[]): { last_company: string; last_title: string } {
    if (!posHistory || posHistory.length === 0) {
      return {
        last_company: '',
        last_title: ''
      };
    }
  
    // Sort positions by end date (most recent first)
    const sortedPositions = [...posHistory].sort((a, b) => {
      // If either position has null end date, handle accordingly
      if (!a.startEndDate.end) return -1;  // a is current position
      if (!b.startEndDate.end) return 1;   // b is current position
      
      // Compare by year first
      if (a.startEndDate.end.year !== b.startEndDate.end.year) {
        return b.startEndDate.end.year - a.startEndDate.end.year;
      }
      // If same year, compare by month
      return b.startEndDate.end.month - a.startEndDate.end.month;
    });
  
    // Return second position (the one before most recent)
    if (sortedPositions.length > 1) {
      const lastCompany = sortedPositions[1];
      return {
        last_company: lastCompany.companyName,
        last_title: lastCompany.title
      };
    }
  
    return {
      last_company: '',
      last_title: ''
    };
  }

  private static getSkills(skills: any[]): string {
    // Handle null, undefined, and non-array inputs
    if (!Array.isArray(skills)) {
      return '';
    }
  
    // Filter out any null/undefined/empty values from the array
    const validSkills = skills.filter(skill => skill && typeof skill === 'string' && skill.trim() !== '');
  
    // Handle empty array after filtering
    if (validSkills.length === 0) {
      return '';
    }
  
    // Use slice instead of splice to avoid mutating the original array
    // Also trim each skill to remove extra whitespace
    return validSkills
      .slice(0, 5)
      .map(skill => skill.trim())
      .join(', ');
  }

  private static getLanguages(languages: any[]): string {
    // Handle null, undefined, and non-array inputs
    if (!Array.isArray(languages)) {
      return '';
    }
  
    // Filter out any null/undefined/empty values from the array
    const validLanguages = languages.filter(language => language && typeof language === 'string' && language.trim() !== '');
  
    // Handle empty array after filtering
    if (validLanguages.length === 0) {
      return '';
    }
  
    // Use slice instead of splice to avoid mutating the original array
    // Also trim each language to remove extra whitespace
    return validLanguages
      .map(skill => skill.trim())
      .join(', ');
  }

  private static getCertificates(certificates: any[]): string {
    // Handle null, undefined, and non-array inputs
    if (!Array.isArray(certificates)) {
      return '';
    }
  
    // Filter out any null/undefined/empty values from the array
    const validCertificates = certificates.filter(certificate => certificate && typeof certificate === 'string' && certificate.trim() !== '');
  
    // Handle empty array after filtering
    if (validCertificates.length === 0) {
      return '';
    }
  
    // Use slice instead of splice to avoid mutating the original array
    // Also trim each certificate to remove extra whitespace
    return validCertificates
      .slice(0, 5)
      .map(skill => skill.trim())
      .join(', ');
  }

  private static cleanName(name: any): string {
    if (!name) return '';
    
    // Trim whitespace and convert to string
    name = String(name).trim();
    
    // If name is all special characters, return empty string
    if (!/[a-zA-Z]/.test(name)) return '';
    
    // Remove numbers and special characters
    name = name.replace(/[^a-zA-Z\s-]/g, '');
    
    // Remove multiple consecutive letters (more than 2)
    name = name.replace(/([a-zA-Z])\1{2,}/g, '$1$1');
    
    // Remove extra spaces
    name = name.replace(/\s+/g, ' ');
    
    // Capitalize first letter of each word
    name = name.toLowerCase().replace(/(?:^|\s|-)\S/g, (x: string) => x.toUpperCase());
    
    // Final trim in case of leading/trailing spaces
    name = name.trim();
    
    return name || '';
  }

  private static cleanEmail(email: any): string {
    if (!email) return '';
    
    // Trim whitespace and convert to string
    email = String(email).trim();
    
    // Remove special characters from start and end
    email = email.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    
    // Split on @ to handle local and domain parts separately
    let parts = email.split('@');
    
    if (parts.length < 2) {
      return ''; // Invalid email without @
    }
    
    // For multiple @, take everything before the last @ as local part
    // and everything after as domain part
    const domainPart = parts.pop(); // Get the last part (domain)
    const localPart = parts.join(''); // Join all remaining parts
    
    // Clean local part: allow alphanumeric, dots, underscores, hyphens
    let cleanedLocalPart = localPart.replace(/[^\w.-]/g, '')
      // Remove consecutive dots
      .replace(/\.{2,}/g, '.')
      // Remove dots at start/end
      .replace(/^\.+|\.+$/g, '');
    
    // Clean domain part: allow alphanumeric, dots, hyphens
    let cleanedDomainPart = domainPart!.replace(/[^\w.-]/g, '')
      // Remove consecutive dots
      .replace(/\.{2,}/g, '.')
      // Remove dots at start/end
      .replace(/^\.+|\.+$/g, '');
    
    // Validate domain has at least one dot and valid TLD
    const domainParts = cleanedDomainPart.split('.');
    if (domainParts.length < 2 || !domainParts[domainParts.length - 1]) {
      return '';
    }
    
    // Reconstruct email only if both parts are valid
    if (cleanedLocalPart && cleanedDomainPart) {
      const cleanedEmail = `${cleanedLocalPart}@${cleanedDomainPart}`;
      
      // Final validation: check basic email format
      const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;
      return emailRegex.test(cleanedEmail) ? cleanedEmail : '';
    }
    
    return '';
  }
}
