export class AIbitatError extends Error {}

export class APIError extends AIbitatError {
  constructor(message?: string | undefined) {
    super(message)
  }
}

/**
 * The error when the AI provider returns an error that should be treated as something
 * that should be retried.
 */
export class RetryError extends APIError {}
