

export type ReportType = typeof ReportType[keyof typeof ReportType];


export const ReportType = {
  lost: 'lost',
  found: 'found',
} as const;
