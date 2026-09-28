
import type { RecoveryCaseStatus } from './recoveryCaseStatus';

export interface RecoveryCase {
  id: string;
  title: string;
  status: RecoveryCaseStatus;
  updatedAt: string;
}
