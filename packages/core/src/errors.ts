export class ArletexError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'ARLETEX_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ArletexError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends ArletexError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', details);
  }
}

export class InferenceError extends ArletexError {
  constructor(message: string, details?: unknown) {
    super(message, 'INFERENCE_ERROR', details);
  }
}

export class ModelUnavailableError extends InferenceError {
  constructor(url: string, details?: unknown) {
    super(`Inference server at ${url} is unreachable or unavailable`, details);
  }
}

export class SecurityError extends ArletexError {
  constructor(message: string, details?: unknown) {
    super(message, 'SECURITY_ERROR', details);
  }
}
