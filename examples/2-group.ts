import {input} from '@inquirer/prompts'

import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

// Ask for the topic of the chat before starting the conversation
const topic = await input({
  message: 'What should we write about?',
  validate: (value: string) => value.length > 0 || 'Please enter the idea',
})

const aibitat = new AIbitat({
  model: 'gpt-4',
  nodes: {
    '#content-creators': [
      'the-strategist',
      'the-researcher',
      'the-writer',
      'the-seo',
      'client',
    ],
  },
  config: {
    client: {
      type: 'assistant',
      role: `You are a human assistant. Your job is to answer relevant question about the work. 
      Reply "TERMINATE" when the-strategist and the-researcher stop suggesting changes.`,
    },
    '#content-creators': {
      type: 'manager',
      role: 'You are a content team.',
    },
    'the-strategist': {
      type: 'agent',
      role: `You are a Content Strategist. You role is to identifying the target audience, outline the overall message and objectives of the blog post based on the topic "${topic}".
      Create a strategy that ensures the blog post aligns with the brand’s message and engages the target audience.`,
    },
    'the-researcher': {
      type: 'agent',
      role: `You are a content Researcher. You conduct thorough research on the chosen topic "${topic}". 
      Collect data, facts, and statistics. Analyze competitor blogs for insights. 
      Provide accurate and up-to-date information that supports the blog post's content.`,
    },
    'the-writer': {
      type: 'agent',
      role: `You are the Writer. You follow the instructions given by the-researcher and the-strategist. 
      You are responsible for creating a well-written, engaging, and error-free the a compelling title and blog post to be posted on Medium. 
      Writing the body of the blog post based on the outline provided. Write in first person.
      Revisit and edit the draft for clarity, coherence, and correctness based on the feedback provided.
      Ask for feedbacks to te group when you are done.`,
    },
    'the-seo': {
      type: 'agent',
      role: `You are the SEO specialist. You are responsible for optimizing the blog post for search engines. 
      You identify relevant keywords and integrate them within the content.
      Provide an optimize post's meta description and title.`,
    },
  },
})

aibitat.onMessage(terminal.print)
aibitat.onTerminate(() => console.timeEnd('🚀 chat finished'))
aibitat.onInterrupt(async node => {
  const feedback = await terminal.askForFeedback(node)
  await aibitat.continue(feedback)
})

await aibitat.start({
  from: 'client',
  to: '#content-creators',
  content: `Write a blog post about "${topic}"`,
})
