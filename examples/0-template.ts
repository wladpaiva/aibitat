import {input} from '@inquirer/prompts'

import {AIbitat} from '../src'
import {cli} from '../src/plugins'

// Ask for the topic of the chat before starting the conversation
const topic = await input({
  message: 'What is the topic of this chat?',
  validate: (value: string) => value.length > 0 || 'Please enter a topic',
})

// Create the AIbitat instance
export const aibitat = new AIbitat()
  .use(cli())
  // Create the agents of the conversation
  .agent('🤖')
  .agent('🧑', {
    interrupt: 'ALWAYS',
    role: 'You are a human assistant.',
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content: `Talk about "${topic}"`,
  })
}
