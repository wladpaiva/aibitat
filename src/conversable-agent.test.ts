import {beforeEach, expect, mock, test} from 'bun:test'
import OpenAI from 'openai'

import {AIProvider} from './ai'
import {ConversableAgent} from './conversable-agent'

test('should talk to each other', async () => {
  const ai = {
    create: mock(() => Promise.resolve('🤖')),
  }
  const first = new ConversableAgent({
    name: '🔥',
    provider: ai as unknown as AIProvider<OpenAI>,
  })
  const second = new ConversableAgent({
    name: '🔴',
    provider: ai as unknown as AIProvider<OpenAI>,
  })

  await first.send('Hello, how are you?', second, true)

  expect(first.chatMessages.get(second)!.length).toBe(2)
  expect(second.chatMessages.get(first)!.length).toBe(2)
  expect(ai.create).toHaveBeenCalled()
  expect(ai.create).toHaveBeenCalledTimes(1)
})

test.todo('should have initial messages', async () => {})

// TODO: 1. Configuration
// system messages

// TODO: 2. generate_function_call_reply
// TODO: 3. check_termination_and_human_reply
// TODO: 4. Cache
// TODO: 5. UserProxy
// TODO: 6. Assistant
// TODO: 7. Group
// TODO: 8. GroupManager
