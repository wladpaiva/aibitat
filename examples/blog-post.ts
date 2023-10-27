import {AIbitat} from 'aibitat'
import {cli, experimental_webBrowsing, fileHistory} from 'aibitat/plugins'

export const aibitat = new AIbitat({
  model: 'gpt-4',
})
  .use(cli())
  .use(fileHistory())
  .use(experimental_webBrowsing())
  .agent('strategist', {
    role: `You are a Content Strategist. Analyze the target audience's preferences, interests, and demographics. 
    Determine the appropriate style and tone for the blog post.`,
  })
  .agent('researcher', {
    role: `You are a Researcher. Conduct thorough research to gather all necessary information about the topic 
    you are writing about. Collect data, facts, and statistics. Analyze competitor blogs for insights. 
    Provide accurate and up-to-date information that supports the blog post's content to @copywriter.`,
    functions: ['web-browsing'],
  })
  .agent('copywriter', {
    role: `You are a Copywriter. Interpret the draft as general idea and write the full blog post using markdown, 
    ensuring it is tailored to the target audience's preferences, interests, and demographics. Apply genre-specific 
    writing techniques relevant to the author's genre. Revisit and edit the post for clarity, coherence, and 
    correctness based on the feedback provided. Ask for feedbacks to the channel when you are done.`,
  })
  .agent('seo', {
    role: `You are an SEO. Ensure the blog post is optimized for search engines. Identify relevant keywords and create meta tags. 
    Ensure the blog post is easy to read and understand.`,
  })
  .agent('pm', {
    role: `You are a Project Manager. Coordinate the project, ensure tasks are completed on time and within budget. 
    Communicate with team members and stakeholders.`,
    interrupt: 'ALWAYS',
  })
  .channel('content-team', [
    'strategist',
    'researcher',
    'copywriter',
    'seo',
    'pm',
  ])

await aibitat.start({
  from: 'pm',
  to: 'content-team',
  content: `We have got this draft of the new blog post, let us start working on it.
  <draft>
  
  ADD DRAFT HERE
  
  </draft>
  `,
})
