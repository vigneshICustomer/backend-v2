// Export all schemas
export * from './users';
export * from './segments';
export * from './connections';
export * from './audiences';

// Re-export commonly used types
export type {
  User,
  NewUser,
  UserSession,
  NewUserSession,
  Organisation,
  NewOrganisation,
  InviteMember,
  NewInviteMember,
} from './users';

export type {
  Segment,
  NewSegment,
  Folder,
  NewFolder,
  UserFilter,
  NewUserFilter,
  Audience,
  NewAudience,
  Integration,
  NewIntegration,
} from './segments';

export type {
  Connection,
  NewConnection,
} from './connections';

export type {
  Object,
  NewObject,
  Relationship,
  NewRelationship,
  Audience as AudienceV2,
  NewAudience as NewAudienceV2,
  AudienceObject,
  NewAudienceObject,
  Cohort,
  NewCohort,
  CohortFilter,
  CohortFilters,
} from './audiences';
