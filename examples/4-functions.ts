import * as cheerio from 'cheerio'

import {AIbitat} from '../src'
import {terminal} from '../src/plugins'

const aibitat = new AIbitat({
  nodes: {
    '🧑': '🤖',
  },
  config: {
    '🧑': {type: 'assistant'},
    '🤖': {type: 'agent', functions: ['aibitat-releases']},
  },
})
  .use(terminal())
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

await aibitat.start({
  from: '🧑',
  to: '🤖',
  content: `Talk about the latest news about AIbitat`,
})
