import {input} from '@inquirer/prompts'

import {AIbitat} from '../src'
import {cli} from '../src/plugins'

// Ask for the mathematical problem of the chat before starting the conversation
const math = await input({
  message: 'What is the mathematical problem of this chat?',
  validate: (value: string) => value.length > 0 || 'Please enter a topic',
})

export const aibitat = new AIbitat()
  .use(cli())
  // Create the agents of the conversation
  .agent('🤖')
  .agent('🧑', {
    interrupt: 'NEVER',
    role: 'You are a human assistant. Reply "TERMINATE" when there is a correct answer or there`s no answer to the question.',
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content: `Solve this mathematical problem "${math}"`,
  })
}
