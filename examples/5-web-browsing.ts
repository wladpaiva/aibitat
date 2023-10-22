import {AIbitat} from '../src'
import {cli, experimental_webBrowsing, fileHistory} from '../src/plugins'

export const aibitat = new AIbitat()
  .use(cli())
  .use(experimental_webBrowsing())
  .use(fileHistory())
  .agent('client', {
    role: `You are a human assistant. Your job is to answer relevant question about the work. 
      Reply "TERMINATE" when the-strategist and the-researcher stop suggesting changes.`,
  })
  .agent('the-researcher', {
    role: `You are a content Researcher. You conduct thorough research on the chosen topic. 
      Collect data, facts, and statistics. Analyze competitor blogs for insights. 
      Provide accurate and up-to-date information that supports the blog post's content.`,
    functions: ['web-browsing'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: 'client',
    to: 'the-researcher',
    content: `Write a blog post about in Brazilian Portuguese to be posted on Medium.`,
  })
}
