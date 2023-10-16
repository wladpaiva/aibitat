import {input} from '@inquirer/prompts'

import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const aibitat = new AIbitat({
  model: 'gpt-3.5-turbo',
  nodes: {
    '🧑': '🤖',
  },
  config: {
    '🧑': {
      type: 'assistant',
      interrupt: 'NEVER',
      role: 'You are a human assistant. Reply "TERMINATE" when there is a correct answer or there`s no answer to the question.',
    },
    '🤖': {type: 'agent'},
  },
})

aibitat.on('message', terminal.print)
aibitat.on('terminate', () => console.timeEnd('🚀 chat finished'))

// Ask for the mathematical problem of the chat before starting the conversation
const math = await input({
  message: 'What is the mathematical problem of this chat?',
  validate: (value: string) => value.length > 0 || 'Please enter a topic',
})

await aibitat.start({
  from: '🧑',
  to: '🤖',
  content: `Solve this mathematical problem "${math}"`,
})
