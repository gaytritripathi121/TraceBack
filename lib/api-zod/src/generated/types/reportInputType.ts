

export type ReportInputType = typeof ReportInputType[keyof typeof ReportInputType];


export const ReportInputType = {
  lost: 'lost',
  found: 'found',
} as const;
