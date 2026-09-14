export class DomainError extends Error {}

export class UnauthenticatedError extends DomainError {}

export class ForbiddenError extends DomainError {}

export class NotFoundError extends DomainError {}

export class ConflictError extends DomainError {}

export class BusinessRuleError extends DomainError {}
