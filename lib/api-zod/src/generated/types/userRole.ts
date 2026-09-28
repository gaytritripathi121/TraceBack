

export type UserRole = typeof UserRole[keyof typeof UserRole];


export const UserRole = {
  user: 'user',
  organization: 'organization',
  admin: 'admin',
} as const;
