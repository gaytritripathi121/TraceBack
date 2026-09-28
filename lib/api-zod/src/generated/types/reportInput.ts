
import type { ReportInputType } from './reportInputType';

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
