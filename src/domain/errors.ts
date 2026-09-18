export class DomainError extends Error {}

export class UnauthenticatedError extends DomainError {}

export class ForbiddenError extends DomainError {}

export class NotFoundError extends DomainError {}

export class ConflictError extends DomainError {}

export class BusinessRuleError extends DomainError {}

/** A single-use code/token that was valid once but no longer is. */
export class ExpiredError extends DomainError {}

/** A single-use code/token that never existed, was already redeemed, or was tampered with. */
export class InvalidCodeError extends DomainError {}

/** A database failure with no domain meaning; answered as a generic 500. */
export class DatabaseOperationError extends DomainError {}
