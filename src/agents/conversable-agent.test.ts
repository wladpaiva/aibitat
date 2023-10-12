import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AIProvider} from '../providers/ai-provider.ts'
import {ConversableAgent} from './conversable-agent.ts'

// HACK: Mock the AI provider.
// This is still needed because Bun doesn't support mocking modules yet.
// Neither mocking the HTTP requests.
const ai = {
  create: mock(() => Promise.resolve('👍')),
}
const provider = ai as unknown as AIProvider<OpenAI>

beforeEach(() => {
  ai.create.mockClear()
})

/**
 * @file Conversable Agent tests.
 */

test('should talk to each other', async () => {
  ai.create.mockImplementationOnce(() => Promise.resolve('TERMINATE'))

  const human = new ConversableAgent({
    name: '🧑',
    provider,
  })
  const bot = new ConversableAgent({
    name: '🤖',
    provider,
  })

  await human.initiateChat(bot, '2 + 2 = 4?')

  expect(human.chatMessages.get(bot)!.length).toBe(2)
  // expect human has the TERMINATE from the bot
  expect(human.chatMessages.get(bot)![1].content).toBe('TERMINATE')
  expect(bot.chatMessages.get(human)!.length).toBe(2)
  expect(provider.create).toHaveBeenCalled()
  expect(provider.create).toHaveBeenCalledTimes(1)
})

// 1. Configuration

test('should have a system message', async () => {
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

test('should terminate the chat', async () => {
  ai.create.mockImplementationOnce(() => Promise.resolve('✅'))

  const human = new ConversableAgent({
    name: '🧑',
    isTerminationMsg: message => message.content === '✅',
    provider,
  })

  const bot = new ConversableAgent({
    name: '🤖',
    isTerminationMsg: message => message.content === '✅',
    provider,
  })

  await human.initiateChat(bot, '2 + 2 = 4?')

  // the chat gets in a loop if the bot doesn't terminate
  expect(true).toBe(true)
})

test('should not engage in infinity conversations', async () => {
  const human = new ConversableAgent({
    name: '🧑',
    provider,
  })

  const bot = new ConversableAgent({
    name: '🤖',
    humanInputMode: 'NEVER',
    provider,
  })

  await human.initiateChat(bot, '2 + 2 = 4?')

  // the chat gets in a loop if the bot doesn't terminate
  expect(true).toBe(true)
})

test.todo('should auto-reply only when user skip engaging', async () => {})

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
