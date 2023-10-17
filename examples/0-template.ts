import {input} from '@inquirer/prompts'

import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const aibitat = new AIbitat({
  nodes: {
    '🧑': '🤖',
  },
  config: {
    '🧑': {type: 'assistant'},
    '🤖': {type: 'agent'},
  },
})

aibitat.onMessage(terminal.print)
aibitat.onTerminate(() => console.timeEnd('🚀 chat finished'))

aibitat.onInterrupt(async node => {
  const feedback = await terminal.askForFeedback(node)
  await aibitat.continue(feedback)
})

// Ask for the topic of the chat before starting the conversation
const topic = await input({
  message: 'What is the topic of this chat?',
  validate: (value: string) => value.length > 0 || 'Please enter a topic',
})

await aibitat.start({
  from: '🧑',
  to: '🤖',
  content: `Talk about "${topic}"`,
})
