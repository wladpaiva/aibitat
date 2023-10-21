import {AIbitat} from '../src'
import {cli, experimental_webBrowsing} from '../src/plugins'

const aibitat = new AIbitat({
  nodes: {},
  config: {
    client: {
      type: 'assistant',
      role: `You are a human assistant. Your job is to answer relevant question about the work. 
      Reply "TERMINATE" when the-strategist and the-researcher stop suggesting changes.`,
    },
    'the-researcher': {
      type: 'agent',
      role: `You are a content Researcher. You conduct thorough research on the chosen topic. 
      Collect data, facts, and statistics. Analyze competitor blogs for insights. 
      Provide accurate and up-to-date information that supports the blog post's content.`,
      functions: ['web-browsing'],
    },
  },
})
  .use(cli())
  .use(experimental_webBrowsing())

await aibitat.start({
  from: 'client',
  to: '#content-creators',
  content: `Write a blog post about in Brazilian Portuguese to be posted on Medium.`,
})
