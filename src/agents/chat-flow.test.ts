import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AIProvider} from '../providers/ai-provider.ts'
import {ChatFlow, type ChatFlowProps} from './chat-flow.ts'

// HACK: Mock the AI provider.
// This is still needed because Bun doesn't support mocking modules yet.
// Neither mocking the HTTP requests.
export const ai = {
  create: mock(() => {}),
}
const provider = ai as unknown as AIProvider<OpenAI>

beforeEach(() => {
  ai.create.mockClear()
  ai.create.mockImplementation(() => Promise.resolve('TERMINATE'))
})

const defaultFlow: ChatFlowProps = {
  provider,
  nodes: {
    '🧑': '🤖',
  },
  config: {
    '🧑': {type: 'assistant'},
    '🤖': {type: 'agent'},
  },
}

const defaultStart = {
  from: '🧑',
  to: '🤖',
  content: '2 + 2 = 4?',
}

test('should reply a chat', async () => {
  const flow = new ChatFlow(defaultFlow)
  await flow.start(defaultStart)

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
  const role = 'You are a 🤖.'

  const flow = new ChatFlow({
    ...defaultFlow,
    config: {
      ...defaultFlow.config,
      '🤖': {type: 'agent', role},
    },
  })

  await flow.start(defaultStart)

  expect(ai.create).toHaveBeenCalledTimes(1)
  // @ts-expect-error
  expect(ai.create.mock.calls[0][0][0].content).toEqual(role)
})

test('should keep chatting util its task is done', async () => {
  let i = 0
  ai.create.mockImplementation(() =>
    Promise.resolve(i >= 10 ? 'TERMINATE' : `... ${i++}`),
  )

  const flow = new ChatFlow({
    ...defaultFlow,
    config: {
      ...defaultFlow.config,
      '🧑': {type: 'assistant', interrupt: 'NEVER'},
    },
  })

  await flow.start(defaultStart)

  // the chat gets in a loop if the bot doesn't terminate
  expect(flow.chats).toHaveLength(12)
})

test('should not engage in infinity conversations', async () => {
  ai.create.mockImplementation(() => Promise.resolve('...'))

  const flow = new ChatFlow({
    ...defaultFlow,
    maxRounds: 4,
    config: {
      ...defaultFlow.config,
      '🧑': {type: 'assistant', interrupt: 'NEVER'},
    },
  })

  await flow.start(defaultStart)

  expect(ai.create).toHaveBeenCalledTimes(3)
})

test('should have initial messages', async () => {
  const flow = new ChatFlow({
    ...defaultFlow,
    maxRounds: 1,
    chats: [
      {
        from: '🧑',
        to: '🤖',
        content: '2 + 2 = 4?',
        state: 'success',
      },
    ],
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
  const flow = new ChatFlow(defaultFlow)

  const callback = mock(() => {})
  flow.on('reply', callback)

  await flow.start(defaultStart)

  expect(callback).toHaveBeenCalledTimes(1)
})

test('should always interrupt interaction after each reply', async () => {
  ai.create.mockImplementation(() => Promise.resolve('...'))

  const flow = new ChatFlow({
    ...defaultFlow,
    interrupt: 'ALWAYS',
  })

  const callback = mock(() => {})
  flow.on('interrupt', callback)

  await flow.start(defaultStart)

  expect(callback).toHaveBeenCalledTimes(1)
})

test('should trigger an event when a interaction is needed', async () => {
  ai.create.mockImplementation(() => Promise.resolve('...'))

  const flow = new ChatFlow({
    ...defaultFlow,
    config: {
      ...defaultFlow.config,
      '🤖': {type: 'agent', interrupt: 'ALWAYS'},
    },
  })

  const callback = mock(() => {})
  flow.on('interrupt', callback)

  await flow.start(defaultStart)

  expect(flow.chats).toHaveLength(2)
})

test('should auto-reply only when user skip engaging', async () => {
  ai.create.mockImplementation(() => Promise.resolve('...'))

  const flow = new ChatFlow(defaultFlow)
  // HACK: we should use `expect.assertions(1)` here but
  // bun has not implemented it yet.
  // so I have to work around it.
  // https://github.com/oven-sh/bun/issues/1825
  const p = new Promise(async resolve => {
    flow.on('interrupt', () => {
      // console.log('🔥 ~ interrupted')
      flow.continue()
      if (flow.chats.length === 100) {
        resolve(true)
      }
    })

    await flow.start(defaultStart)
  })

  expect(p).resolves.toBeTrue()
  expect(flow.chats).toHaveLength(100)
})

test('should continue conversation with user`s feedback', async () => {
  ai.create.mockImplementation(() => Promise.resolve('...'))

  const flow = new ChatFlow({
    ...defaultFlow,
    maxRounds: 10,
  })

  // HACK: we should use `expect.assertions(1)` here but
  // bun has not implemented it yet.
  // so I have to work around it.
  // https://github.com/oven-sh/bun/issues/1825
  const p = new Promise(async resolve => {
    flow.on('interrupt', a => {
      if (flow.chats.length < 10) {
        flow.continue('my feedback')
      } else {
        resolve(true)
      }
    })

    await flow.start(defaultStart)
  })

  expect(p).resolves.toBeTrue()
  expect(flow.chats[2].from).toBe('🧑')
  expect(flow.chats[2].to).toBe('🤖')
  expect(flow.chats[2].content).toBe('my feedback')
})

test.todo('should call a function', async () => {})

test.todo('should execute code', async () => {})
