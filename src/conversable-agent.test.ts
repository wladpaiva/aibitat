import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AIProvider} from './ai'
import {ConversableAgent} from './conversable-agent'

// HACK: Mock the AI provider.
// This is still needed because Bun doesn't support mocking modules yet.
// Neither mocking the HTTP requests.
const ai = {
  create: mock(() => Promise.resolve('🤖')),
}
const provider = ai as unknown as AIProvider<OpenAI>

beforeEach(() => {
  ai.create.mockClear()
})

/**
 * @file Conversable Agent tests.
 */

test('should talk to each other', async () => {
  const first = new ConversableAgent({
    name: '🔥',
    provider,
  })
  const second = new ConversableAgent({
    name: '🔴',
    provider,
  })

  await first.send('Hello, how are you?', second, true)

  expect(first.chatMessages.get(second)!.length).toBe(2)
  expect(second.chatMessages.get(first)!.length).toBe(2)
  expect(provider.create).toHaveBeenCalled()
  expect(provider.create).toHaveBeenCalledTimes(1)
})

// 1. Configuration

test('should start with the system message', async () => {
  const systemMessage = 'You are a 🤖.'

  const first = new ConversableAgent({
    name: '✅',
    provider,
  })
  const second = new ConversableAgent({
    name: '🤖',
    provider,
    systemMessage,
  })

  await first.send('Hello, how are you?', second, true)

  expect(ai.create).toHaveBeenCalledTimes(1)
  // @ts-expect-error
  expect(ai.create.mock.calls[0][0][0].content).toEqual(systemMessage)
})

test.todo('should check if it is a termination message', async () => {
  // TODO: 3. check_termination_and_human_reply
})

test.todo('should check max consecutives auto replies', async () => {})

test.todo('should check humnaInputMode', async () => {})

test.todo(
  'should check if the message is a function call and call the function',
  async () => {
    // TODO: 2. generate_function_call_reply
  },
)

test.todo('should execute code', async () => {})

test.todo('should have initial messages', async () => {})

// TODO: 4. Cache
// TODO: 5. UserProxy
// TODO: 6. Assistant
// TODO: 7. Group
// TODO: 8. GroupManager
