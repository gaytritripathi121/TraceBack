
export interface HealthStatus {
  status: string;
}

export type UserRole = typeof UserRole[keyof typeof UserRole];


export const UserRole = {
  user: 'user',
  organization: 'organization',
  admin: 'admin',
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  createdAt: string;
}

export interface RegisterInput {
  /** @minLength 2 */
  name: string;
  email: string;
  /** @minLength 8 */
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface WorkspaceSummary {
  lost: number;
  found: number;
  matches: number;
  activeCases: number;
  recovered: number;
  unreadNotifications: number;
}

export type ReportType = typeof ReportType[keyof typeof ReportType];


export const ReportType = {
  lost: 'lost',
  found: 'found',
} as const;

export type ReportStatus = typeof ReportStatus[keyof typeof ReportStatus];


export const ReportStatus = {
  active: 'active',
  matched: 'matched',
  recovered: 'recovered',
  archived: 'archived',
} as const;

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  category: string;
  description: string;
  /** @nullable */
  brand?: string | null;
  /** @nullable */
  color?: string | null;
  area: string;
  /** @nullable */
  date?: string | null;
  reportedAt: string;
  status: ReportStatus;
  ownerId: string;
  ownerName?: string;
  isMine?: boolean;
}

export type ReportInputType = typeof ReportInputType[keyof typeof ReportInputType];


export const ReportInputType = {
  lost: 'lost',
  found: 'found',
} as const;

export interface ReportInput {
  type: ReportInputType;
  /** @minLength 2 */
  title: string;
  category: string;
  description: string;
  brand?: string;
  color?: string;
  area: string;
  date?: string;
  time?: string;
  privateDetails?: string;
}

export interface ReportUpdate {
  title?: string;
  description?: string;
  status?: string;
}

export type MatchStatus = typeof MatchStatus[keyof typeof MatchStatus];


export const MatchStatus = {
  pending: 'pending',
  interested: 'interested',
  declined: 'declined',
  verified: 'verified',
} as const;

export interface Match {
  id: string;
  score: number;
  sharedAttributes: string[];
  status: MatchStatus;
  report: Report;
}

export type MatchResponseInputResponse = typeof MatchResponseInputResponse[keyof typeof MatchResponseInputResponse];


export const MatchResponseInputResponse = {
  interested: 'interested',
  declined: 'declined',
  unsure: 'unsure',
} as const;

export interface MatchResponseInput {
  response: MatchResponseInputResponse;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  subject: string;
  participantName: string;
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface MessageInput {
  /** @minLength 1 */
  body: string;
}

export type RecoveryCaseStatus = typeof RecoveryCaseStatus[keyof typeof RecoveryCaseStatus];


export const RecoveryCaseStatus = {
  potential: 'potential',
  verification: 'verification',
  scheduled: 'scheduled',
  recovered: 'recovered',
  disputed: 'disputed',
  closed: 'closed',
} as const;

export interface RecoveryCase {
  id: string;
  title: string;
  status: RecoveryCaseStatus;
  updatedAt: string;
}

export type SearchParameter = string;

export type ReportTypeParameter = typeof ReportTypeParameter[keyof typeof ReportTypeParameter];


export const ReportTypeParameter = {
  lost: 'lost',
  found: 'found',
} as const;

export type CategoryParameter = string;

export type ListReportsParams = {
search?: SearchParameter;
type?: ReportTypeParameter;
category?: CategoryParameter;
};

