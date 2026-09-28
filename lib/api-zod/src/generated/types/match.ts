
import type { MatchStatus } from './matchStatus';
import type { Report } from './report';

export interface Match {
  id: string;
  score: number;
  sharedAttributes: string[];
  status: MatchStatus;
  report: Report;
}
