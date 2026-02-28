import * as cheerio from 'cheerio'

import {AIbitat} from '../src'
import {cli} from '../src/plugins'

export const aibitat = new AIbitat({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20240620',
})
  .use(cli())
  .function({
    name: 'aibitat-releases',
    description: 'List of releases of AIbitat and the notes for each release.',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const response = await fetch(
        'https://github.com/wladiston/aibitat/releases',
      )
      const html = await response.text()
      const text = cheerio.load(html).text()
      return text
    },
  })
  .agent('🧑', {
    interrupt: 'ALWAYS',
    role: 'You are a human assistant.',
  })
  .agent('🤖', {
    functions: ['aibitat-releases'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content: `Talk about the latest news about AIbitat`,
  })
}
