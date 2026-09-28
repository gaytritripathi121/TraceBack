
import type { UserRole } from './userRole';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** @nullable */
  avatar?: string | null;
  createdAt: string;
}
