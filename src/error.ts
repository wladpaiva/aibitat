export class AIbitatError extends Error {}

/**
 * The error for the AIbitat class when the AI provider returns a rate limit error.
 */
export class APIError extends AIbitatError {
  constructor(message?: string | undefined) {
    super(message)
  }
}

export class AuthorizationError extends AIbitatError {}
export class UnknownError extends AIbitatError {}
export class RateLimitError extends AIbitatError {}
export class ServerError extends AIbitatError {}

// // ANTHROPIC
// 400 - Invalid request: there was an issue with the format or content of your request.
// 401 - Unauthorized: there's an issue with your API key.
// 403 - Forbidden: your API key does not have permission to use the specified resource.
// 404 - Not found: the requested resource was not found.
// 429 - Your account has hit a rate limit.
// 500 - An unexpected error has occurred internal to Anthropic's systems.
// 529 - Anthropic's API is temporarily overloaded.
