

export type RecoveryCaseStatus = typeof RecoveryCaseStatus[keyof typeof RecoveryCaseStatus];


export const RecoveryCaseStatus = {
  potential: 'potential',
  verification: 'verification',
  scheduled: 'scheduled',
  recovered: 'recovered',
  disputed: 'disputed',
  closed: 'closed',
} as const;
