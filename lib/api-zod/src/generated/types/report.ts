
import type { ReportStatus } from './reportStatus';
import type { ReportType } from './reportType';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  category: string;
  description: string;
  brand?: string | null;
  color?: string | null;
  area: string;
  date?: string | null;
  reportedAt: string;
  status: ReportStatus;
  ownerId: string;
  ownerName?: string;
  isMine?: boolean;
}
