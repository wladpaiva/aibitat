import {AIbitat} from '../src'
import {cli, fileHistory} from '../src/plugins'

const aibitat = new AIbitat({
  model: 'gpt-4',
})
  .use(cli())
  .use(fileHistory())
  .agent('creativeDirector', {
    role: `You are a Creative Director. Your role is overseeing the entire branding project, ensuring
     the client's brief is met, and maintaining consistency across all brand elements, developing the 
     brand strategy, guiding the visual and conceptual direction, and providing overall creative leadership.`,
  })
  .agent('brandStrategist', {
    role: `You are a Brand Strategist. Your role is working closely with the client to understand their 
    goals, target audience, and competitive landscape. Conduct research and analysis to develop a 
    comprehensive brand strategy that aligns with the client's brief and business objectives, defining 
    the brand positioning, messaging, and value proposition.`,
  })
  .agent('marketingSpecialist', {
    role: `You are a Marketing Specialist. Your role is developing a marketing plan to create awareness 
    and promote the brand. Identify target channels, develop promotional campaigns, and coordinate with 
    various teams to execute the marketing initiatives. Your tasks include managing digital marketing 
    platforms, PR activities, and analyzing campaign results. Collaborate with @brandStrategist to 
    ensure the marketing plan is aligned with the brand strategy.`,
  })
  .agent('graphicDesigner', {
    role: `You are a Graphic Designer. Your role is creating the visual elements that reflect the brand's 
    identity, designing the logo, typography, color palette, and other visual assets, ensuring all 
    brand materials adhere to the AIbitat framework's guidelines while meeting the client's requirements.`,
  })
  .agent('copywriter', {
    role: `You are a Copywriter. Your role is crafting compelling and cohesive brand messages across 
    various communication channels. Write taglines, website content, social media posts, and other 
    promotional materials to effectively communicate the brand's values and voice. Ensure the messaging 
    is consistent with the brand strategy.`,
  })
  .agent('webDeveloper', {
    role: `You are a Web Developer. Your role is building the brand's website according to the client's 
    brief, ensuring the website is user-friendly, visually appealing, and responsive across different devices. 
    Implementing the brand's visual elements and integrating necessary functionalities.`,
  })

  .agent('projectCoordinator', {
    role: `You are the Project Coordinator. Your role is overseeing the project's progress, timeline, 
    and budget. Ensure effective communication and coordination among team members, client, and stakeholders. 
    Your tasks include planning and scheduling project milestones, tracking tasks, and managing any 
    risks or issues that arise.`,
  })
  .agent('client', {
    interrupt: 'ALWAYS',
    role: `You are a human assistant.`,
  })
  .channel('branding', [
    'creativeDirector',
    'brandStrategist',
    'graphicDesigner',
    'copywriter',
    'webDeveloper',
    'marketingSpecialist',
    'projectCoordinator',
    'client',
  ])

await aibitat.start({
  from: 'client',
  to: 'branding',
  content: `Crie uma marca para uma estrutura de IA que permita criar agentes de IA que podem interagir entre si ao mesmo tempo que permite a interação humana. 
  O nome conceitual inicial é AIbitat, pois é um habitat para agentes de IA. Os agentes de IA podem ser utilizados para qualquer propósito e interagem entre si 
  usando canais, de maneira semelhante a como os humanos interagem entre si usando o Slack.`,
})
