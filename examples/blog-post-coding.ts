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
    writing techniques relevant to the author's genre. Add code examples when needed. Code must be written in 
    Typescript. Always mention references. Revisit and edit the post for clarity, coherence, and 
    correctness based on the feedback provided. Ask for feedbacks to the channel when you are done`,
  })
  .agent('designer', {
    role: `You are a Designer. Analyze the core message of the blog post proposed by @copywriter and where in the 
    world this message is mostly evident. Think of an photographer artist that would mostly fit convey this message. 
    Using this formula to write Midjourney Prompts:
    (image we're prompting), (5 descriptive keywords or phrases), (art style), (artist name), (art medium)
    Create 5 prompts:`,
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
    'designer',
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
