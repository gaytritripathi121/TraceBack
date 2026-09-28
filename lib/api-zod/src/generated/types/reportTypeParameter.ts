
export type ReportTypeParameter = typeof ReportTypeParameter[keyof typeof ReportTypeParameter];


export const ReportTypeParameter = {
  lost: 'lost',
  found: 'found',
} as const;
