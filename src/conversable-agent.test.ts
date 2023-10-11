import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AgentAI} from './ai'
import {ConversableAgent} from './conversable-agent'

test('should talk to each other', async () => {
  const ai = {
    client: {
      completion: {
        create: mock(() => Promise.resolve('🤖')),
      },
    },
    create: mock(() => Promise.resolve('🤖')),
  } as unknown as AgentAI<OpenAI>
  const first = new ConversableAgent('🔥', ai)
  const second = new ConversableAgent('🔴', ai)

  await first.send('Hello, how are you?', second, true)

  expect(first.chatMessages.get(second)!.length).toBe(2)
  expect(second.chatMessages.get(first)!.length).toBe(2)
})
