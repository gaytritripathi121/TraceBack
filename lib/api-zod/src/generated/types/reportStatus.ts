
export type ReportStatus = typeof ReportStatus[keyof typeof ReportStatus];


export const ReportStatus = {
  active: 'active',
  matched: 'matched',
  recovered: 'recovered',
  archived: 'archived',
} as const;
