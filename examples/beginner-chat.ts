import * as cheerio from 'cheerio'

import {AIbitat} from '../src'
import {cli} from '../src/plugins'

enum Agent {
  HUMAN = '🧑',
  AI = '🤖',
}

export const aibitat = new AIbitat({
  provider: 'openai',
  model: 'gpt-3.5-turbo',
})
  .use(cli())
  .function({
    name: 'aibitat-documentations',
    description: 'The documentation about aibitat AI project.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const response = await fetch(
        'https://raw.githubusercontent.com/wladiston/aibitat/main/README.md',
      )
      const html = await response.text()
      return cheerio.load(html).text()
    },
  })
  .agent(Agent.HUMAN, {
    interrupt: 'ALWAYS',
    role: 'You are a human assistant.',
  })
  .agent(Agent.AI, {
    functions: ['aibitat-documentations'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: Agent.HUMAN,
    to: Agent.AI,
    content: `Please, talk about the documentation of AIbitat.`,
  })
}
