

export type MatchStatus = typeof MatchStatus[keyof typeof MatchStatus];


export const MatchStatus = {
  pending: 'pending',
  interested: 'interested',
  declined: 'declined',
  verified: 'verified',
} as const;
