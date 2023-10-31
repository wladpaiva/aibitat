import {beforeEach, describe, expect, mock, test} from 'bun:test'

import {AuthorizationError} from '../error.ts'
import {Message} from './ai-provider.ts'
import {OpenAIProvider} from './openai.ts'

// NOTE: some tests are skipped because it requires a way to mock the http requests.

// // OPENAI
// 401 - Invalid Authentication	Cause: Invalid Authentication
// Solution: Ensure the correct API key and requesting organization are being used.
// 401 - Incorrect API key provided	Cause: The requesting API key is not correct.
// Solution: Ensure the API key used is correct, clear your browser cache, or generate a new one.
// 401 - You must be a member of an organization to use the API	Cause: Your account is not part of an organization.
// Solution: Contact us to get added to a new organization or ask your organization manager to invite you to an organization.
// 429 - Rate limit reached for requests	Cause: You are sending requests too quickly.
// Solution: Pace your requests. Read the Rate limit guide.
// 429 - You exceeded your current quota, please check your plan and billing details	Cause: You have hit your maximum monthly spend (hard limit) which you can view in the account billing section.
// Solution: Apply for a quota increase.
// 500 - The server had an error while processing your request	Cause: Issue on our servers.
// Solution: Retry your request after a brief wait and contact us if the issue persists. Check the status page.
// 503 - The engine is currently overloaded, please try again later	Cause: Our servers are experiencing high traffic.
// Solution: Please retry your requests after a brief wait.

const message: Message[] = [
  {
    content: 'Hello',
    role: 'user',
  },
]

test('should throw an error when there`s an authorization error', async () => {
  const provider = new OpenAIProvider({
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
