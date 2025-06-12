// Export all schemas
export * from './users';
export * from './segments';

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
