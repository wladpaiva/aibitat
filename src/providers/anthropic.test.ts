import {beforeEach, describe, expect, mock, test} from 'bun:test'

import {AuthorizationError} from '../error.ts'
import {Message} from './ai-provider.ts'
import {AnthropicProvider} from './anthropic.ts'

// NOTE: some tests are skipped because it requires a way to mock the http requests.

// // ANTHROPIC - https://docs.anthropic.com/claude/reference/errors-and-rate-limits
// 400 - Invalid request: there was an issue with the format or content of your request.
// 401 - Unauthorized: there's an issue with your API key.
// 403 - Forbidden: your API key does not have permission to use the specified resource.
// 404 - Not found: the requested resource was not found.
// 429 - Your account has hit a rate limit.
// 500 - An unexpected error has occurred internal to Anthropic's systems.
// 529 - Anthropic's API is temporarily overloaded.

const message: Message[] = [
  {
    content: 'Hello',
    role: 'user',
  },
]

test('should throw an error when there`s an authorization error', async () => {
  const provider = new AnthropicProvider({
    options: {
      apiKey: 'invalid',
    },
  })

  await expect(provider.create(message)).rejects.toBeInstanceOf(
    AuthorizationError,
  )
})

test.todo('should throw a generic error when something else happens', () => {})
test.todo('should throw a RateLimitError', () => {})
test.todo('should throw a ServerError', () => {})
