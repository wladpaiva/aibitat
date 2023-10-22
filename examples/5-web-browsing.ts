import {AIbitat} from '../src'
import {cli, experimental_webBrowsing, fileHistory} from '../src/plugins'

export const aibitat = new AIbitat()
  .use(cli())
  .use(experimental_webBrowsing())
  .use(fileHistory())
  .agent('client', {})
  .agent('the-researcher', {
    functions: ['web-browsing'],
    model: 'gpt-4',
    role: `You are a researcher. Your job is to research on the internet about the topic.`,
  })

if (import.meta.main) {
  await aibitat.start({
    from: 'client',
    to: 'the-researcher',
    content: `Write a blog post about the latest news in AI in Brazilian Portuguese to be posted on Medium.`,
  })
}
