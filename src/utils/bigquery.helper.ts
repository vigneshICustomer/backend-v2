import { BigQuery } from '@google-cloud/bigquery';

// Types for access analysis
export interface AccessInfo {
  directRoles: string[];
  groupRoles: { group: string; role: string }[];
  specialAccess: { group: string; role: string }[];
  allAccess: string[];
  hasAccess: boolean;
}

export interface ProjectAccess {
  canListDatasets: boolean;
  canRunQueries: boolean;
}

export interface CombinedAccess extends AccessInfo {
  projectAccess: ProjectAccess;
  effectiveAccess: string[];
}

/**
 * Analyze access entries to determine what access a service account has
 * @param accessEntries Array of access entries from BigQuery metadata
 * @param serviceAccountEmail Email of the service account to check
 * @returns AccessInfo object with categorized access information
 */
export function analyzeAccess(accessEntries: any[], serviceAccountEmail: string): AccessInfo {
  const accessInfo: AccessInfo = {
    directRoles: [],
    groupRoles: [],
    specialAccess: [],
    allAccess: [],
    hasAccess: false
  };

  for (const entry of accessEntries) {
    // Direct service account access
    if (entry.userByEmail === serviceAccountEmail) {
      accessInfo.directRoles.push(entry.role);
      accessInfo.hasAccess = true;
    }
    
    // Group access (you might be in these groups)
    if (entry.groupByEmail) {
      accessInfo.groupRoles.push({
        group: entry.groupByEmail,
        role: entry.role
      });
      // Note: We can't definitively say if SA is in the group without additional API calls
    }
    
    // Special access patterns
    if (entry.specialGroup) {
      accessInfo.specialAccess.push({
        group: entry.specialGroup,
        role: entry.role
      });
      
      // Check for broad access grants
      if (entry.specialGroup === 'allUsers' || entry.specialGroup === 'allAuthenticatedUsers') {
        accessInfo.allAccess.push(entry.role);
        accessInfo.hasAccess = true;
      }
    }
    
    // Domain access
    if (entry.domain && serviceAccountEmail.endsWith(`@${entry.domain}`)) {
      accessInfo.directRoles.push(entry.role);
      accessInfo.hasAccess = true;
    }
  }

  return accessInfo;
}

/**
 * Check project-level permissions by testing BigQuery operations
 * @param bigquery BigQuery client instance
 * @returns ProjectAccess object with capability information
 */
export async function checkProjectAccess(bigquery: BigQuery): Promise<ProjectAccess> {
  try {
    // Test if we can list datasets (indicates some project-level access)
    const [datasets] = await bigquery.getDatasets({ maxResults: 1 });
    
    // Test if we can run jobs (indicates bigquery.jobs.create permission)
    const canRunJobs = await bigquery.query({
      query: 'SELECT 1 as test',
      dryRun: true
    }).then(() => true).catch(() => false);
    
    const projectAccess: ProjectAccess = {
      canListDatasets: true, // We got here, so this is true
      canRunQueries: canRunJobs,
      // You could add more capability tests here
    };
    
    return projectAccess;
  } catch (error) {
    console.warn('Could not test project access:', error);
    return {
      canListDatasets: false,
      canRunQueries: false
    };
  }
}

/**
 * Combine dataset access information with project access information
 * @param datasetAccess Access information specific to a dataset
 * @param projectAccess Project-level access information
 * @returns Combined access information
 */
export function combineAccessInfo(datasetAccess: AccessInfo, projectAccess: ProjectAccess): CombinedAccess {
  return {
    ...datasetAccess,
    projectAccess,
    effectiveAccess: [
      ...datasetAccess.directRoles,
      ...datasetAccess.allAccess
    ]
  };
}

/**
 * Log detailed access information for a dataset
 * @param datasetId Dataset identifier
 * @param combinedAccess Combined access information
 */
export function logAccessInfo(datasetId: string, combinedAccess: CombinedAccess): void {
  console.log(`Dataset: ${datasetId}`);
  console.log(`- Direct roles: ${combinedAccess.directRoles.join(', ') || 'None'}`);
  console.log(`- Can list datasets: ${combinedAccess.projectAccess.canListDatasets}`);
  console.log(`- Can run queries: ${combinedAccess.projectAccess.canRunQueries}`);
  console.log(`- Group memberships found: ${combinedAccess.groupRoles.length}`);
  console.log(`- Special access grants: ${combinedAccess.specialAccess.length}`);
  console.log(`- Has confirmed access: ${combinedAccess.hasAccess}`);
}

/**
 * Format access information for API response
 * @param accessInfo Combined access information
 * @returns Formatted access object for API response
 */
export function formatAccessResponse(accessInfo: CombinedAccess | { error: string; hasAccess: boolean }) {
  if ('error' in accessInfo) {
    return {
      hasConfirmedAccess: accessInfo.hasAccess,
      directRoles: [],
      projectAccess: {},
      potentialGroupAccess: [],
      specialAccess: [],
      summary: 'Error retrieving access information',
      error: accessInfo.error
    };
  }

  return {
    hasConfirmedAccess: accessInfo.hasAccess,
    directRoles: accessInfo.directRoles || [],
    projectAccess: accessInfo.projectAccess || {},
    potentialGroupAccess: accessInfo.groupRoles || [],
    specialAccess: accessInfo.specialAccess || [],
    summary: accessInfo.effectiveAccess?.length > 0 
      ? `Access confirmed via: ${accessInfo.effectiveAccess.join(', ')}`
      : 'No confirmed direct access - may have access through group membership or project-level permissions',
    error: undefined
  };
}
