import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AIProvider} from '../providers/ai-provider.ts'
import {ChatFlow} from './ChatFlow.ts'

// HACK: Mock the AI provider.
// This is still needed because Bun doesn't support mocking modules yet.
// Neither mocking the HTTP requests.
export const ai = {
  create: mock(() => Promise.resolve('some random reply')),
}
const provider = ai as unknown as AIProvider<OpenAI>

beforeEach(() => {
  ai.create.mockReset()
})

test('should reply a chat', async () => {
  // mock the AI provider to not get stuck in a loop
  ai.create.mockImplementationOnce(() => Promise.resolve('TERMINATE'))

  const flow = new ChatFlow({
    provider,
    nodes: {
      '🧑': '🤖',
    },
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent'},
    },
  })

  await flow.start({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
  })

  expect(flow.chats).toHaveLength(2)
  // expect human has the TERMINATE from the bot
  expect(flow.chats.at(-1)).toEqual({
    from: '🤖',
    to: '🧑',
    content: 'TERMINATE',
    state: 'success',
  })
})

test('should have a system message', async () => {
  ai.create.mockImplementationOnce(() => Promise.resolve('TERMINATE'))
  const role = 'You are a 🤖.'

  const flow = new ChatFlow({
    provider,
    nodes: {
      '🧑': '🤖',
    },
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent', role},
    },
  })

  await flow.start({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
  })

  expect(ai.create).toHaveBeenCalledTimes(1)
  // @ts-expect-error
  expect(ai.create.mock.calls[0][0][0].content).toEqual(role)
})

test('should interact with a reply', async () => {
  let i = 0
  ai.create.mockImplementation(() =>
    Promise.resolve(i >= 10 ? 'TERMINATE' : `yes ${i++}`),
  )

  const flow = new ChatFlow({
    provider,
    nodes: {
      '🧑': '🤖',
    },
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent'},
    },
  })

  await flow.start({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
  })

  // the chat gets in a loop if the bot doesn't terminate
  expect(flow.chats).toHaveLength(12)
})

test('should not engage in infinity conversations', async () => {
  const flow = new ChatFlow({
    provider,
    maxRounds: 4,
    nodes: {
      '🧑': '🤖',
    },
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent'},
    },
  })

  await flow.start({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
  })

  expect(ai.create).toHaveBeenCalledTimes(3)
})

test('should have initial messages', async () => {
  ai.create.mockImplementationOnce(() => Promise.resolve('TERMINATE'))

  const flow = new ChatFlow({
    provider,
    maxRounds: 1,
    nodes: {
      '🧑': '🤖',
    },
    chats: [
      {
        from: '🧑',
        to: '🤖',
        content: '2 + 2 = 4?',
        state: 'success',
      },
    ],
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent'},
    },
  })

  await flow.start({
    from: '🤖',
    to: '🧑',
    content: '4',
  })

  expect(flow.chats).toHaveLength(3)
  expect(flow.chats.at(0)).toEqual({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
    state: 'success',
  })
})

test('should trigger an event when a reply is received', async () => {
  ai.create.mockImplementationOnce(() => Promise.resolve('TERMINATE'))

  const flow = new ChatFlow({
    provider,
    nodes: {
      '🧑': '🤖',
    },
    config: {
      '🧑': {type: 'assistant'},
      '🤖': {type: 'agent'},
    },
  })

  const callback = mock(() => {})
  flow.on('reply', callback)

  await flow.start({
    from: '🧑',
    to: '🤖',
    content: '2 + 2 = 4?',
  })

  //   expect(callback).toHaveBeenCalledTimes(1)
  expect(callback.mock.calls).toHaveLength(1)
})
test.todo('should trigger an event when a reply is needed', async () => {})

test.todo('should auto-reply only when user skip engaging', async () => {})

test.todo(
  'should check if the message is a function call and call the function',
  async () => {},
)

test.todo('should execute code', async () => {})
