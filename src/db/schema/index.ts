// Export all schemas
export * from './users';
export * from './segments';
export * from './connections';

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
