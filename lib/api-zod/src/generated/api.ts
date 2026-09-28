
import * as zod from 'zod';



export const HealthCheckResponse = zod.object({
  "status": zod.string()
})



export const registerBodyNameMin = 2;

export const registerBodyPasswordMin = 8;



export const RegisterBody = zod.object({
  "name": zod.string().min(registerBodyNameMin),
  "email": zod.string().email(),
  "password": zod.string().min(registerBodyPasswordMin)
})

export const RegisterResponse = zod.object({
  "user": zod.object({
  "id": zod.string(),
  "name": zod.string(),
  "email": zod.string(),
  "role": zod.enum(['user', 'organization', 'admin']),
  "avatar": zod.string().nullish(),
  "createdAt": zod.string()
})
})


/**
 * @summary Log in to TraceBack
 */
export const LoginBody = zod.object({
  "email": zod.string().email(),
  "password": zod.string()
})

export const LoginResponse = zod.object({
  "user": zod.object({
  "id": zod.string(),
  "name": zod.string(),
  "email": zod.string(),
  "role": zod.enum(['user', 'organization', 'admin']),
  "avatar": zod.string().nullish(),
  "createdAt": zod.string()
})
})



export const LogoutResponse = zod.void()



export const GetCurrentUserResponse = zod.object({
  "id": zod.string(),
  "name": zod.string(),
  "email": zod.string(),
  "role": zod.enum(['user', 'organization', 'admin']),
  "avatar": zod.string().nullish(),
  "createdAt": zod.string()
})



export const GetWorkspaceSummaryResponse = zod.object({
  "lost": zod.number().int(),
  "found": zod.number().int(),
  "matches": zod.number().int(),
  "activeCases": zod.number().int(),
  "recovered": zod.number().int(),
  "unreadNotifications": zod.number().int()
})


/**
 * @summary Get recent user-scoped activity
 */
export const GetActivityResponseItem = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "description": zod.string(),
  "createdAt": zod.string()
})
export const GetActivityResponse = zod.array(GetActivityResponseItem)



export const ListReportsQueryParams = zod.object({
  "search": zod.coerce.string().optional(),
  "type": zod.enum(['lost', 'found']).optional(),
  "category": zod.coerce.string().optional()
})

export const ListReportsResponseItem = zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})
export const ListReportsResponse = zod.array(ListReportsResponseItem)



export const createReportBodyTitleMin = 2;



export const CreateReportBody = zod.object({
  "type": zod.enum(['lost', 'found']),
  "title": zod.string().min(createReportBodyTitleMin),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().optional(),
  "color": zod.string().optional(),
  "area": zod.string(),
  "date": zod.string().optional(),
  "time": zod.string().optional(),
  "privateDetails": zod.string().optional()
})

export const CreateReportResponse = zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})



export const GetReportParams = zod.object({
  "id": zod.coerce.string()
})

export const GetReportResponse = zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})



export const UpdateReportParams = zod.object({
  "id": zod.coerce.string()
})

export const UpdateReportBody = zod.object({
  "title": zod.string().optional(),
  "description": zod.string().optional(),
  "status": zod.string().optional()
})

export const UpdateReportResponse = zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})


export const DeleteReportParams = zod.object({
  "id": zod.coerce.string()
})

export const DeleteReportResponse = zod.void()



export const ListMatchesResponseItem = zod.object({
  "id": zod.string(),
  "score": zod.number().int(),
  "sharedAttributes": zod.array(zod.string()),
  "status": zod.enum(['pending', 'interested', 'declined', 'verified']),
  "report": zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})
})
export const ListMatchesResponse = zod.array(ListMatchesResponseItem)


/**
 * @summary Respond to a potential match
 */
export const RespondToMatchParams = zod.object({
  "id": zod.coerce.string()
})

export const RespondToMatchBody = zod.object({
  "response": zod.enum(['interested', 'declined', 'unsure'])
})

export const RespondToMatchResponse = zod.object({
  "id": zod.string(),
  "score": zod.number().int(),
  "sharedAttributes": zod.array(zod.string()),
  "status": zod.enum(['pending', 'interested', 'declined', 'verified']),
  "report": zod.object({
  "id": zod.string(),
  "type": zod.enum(['lost', 'found']),
  "title": zod.string(),
  "category": zod.string(),
  "description": zod.string(),
  "brand": zod.string().nullish(),
  "color": zod.string().nullish(),
  "area": zod.string(),
  "date": zod.string().nullish(),
  "reportedAt": zod.string(),
  "status": zod.enum(['active', 'matched', 'recovered', 'archived']),
  "ownerId": zod.string(),
  "ownerName": zod.string().optional(),
  "isMine": zod.boolean().optional()
})
})


export const ListNotificationsResponseItem = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "body": zod.string(),
  "type": zod.string(),
  "read": zod.boolean(),
  "createdAt": zod.string()
})
export const ListNotificationsResponse = zod.array(ListNotificationsResponseItem)



export const ListConversationsResponseItem = zod.object({
  "id": zod.string(),
  "subject": zod.string(),
  "participantName": zod.string(),
  "lastMessage": zod.string(),
  "updatedAt": zod.string()
})
export const ListConversationsResponse = zod.array(ListConversationsResponseItem)


/**
 * @summary List messages in an authorized conversation
 */
export const ListMessagesParams = zod.object({
  "id": zod.coerce.string()
})

export const ListMessagesResponseItem = zod.object({
  "id": zod.string(),
  "body": zod.string(),
  "senderId": zod.string(),
  "createdAt": zod.string()
})
export const ListMessagesResponse = zod.array(ListMessagesResponseItem)


/**
 * @summary Send a secure message
 */
export const SendMessageParams = zod.object({
  "id": zod.coerce.string()
})




export const SendMessageBody = zod.object({
  "body": zod.string().min(1)
})

export const SendMessageResponse = zod.object({
  "id": zod.string(),
  "body": zod.string(),
  "senderId": zod.string(),
  "createdAt": zod.string()
})



export const ListRecoveryCasesResponseItem = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "status": zod.enum(['potential', 'verification', 'scheduled', 'recovered', 'disputed', 'closed']),
  "updatedAt": zod.string()
})
export const ListRecoveryCasesResponse = zod.array(ListRecoveryCasesResponseItem)


