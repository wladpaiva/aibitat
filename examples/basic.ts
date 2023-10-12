import {AssistantAgent, OpenAIProvider, UserProxyAgent} from '../src'

console.log('🚀 starting')
console.time('🚀 finishing')

const provider = new OpenAIProvider({
  model: 'gpt-3.5-turbo',
})

const assistant = new AssistantAgent({
  name: '🤖',
  provider,
  onMessageReceived(message, sender) {
    console.log(`${sender.name}: ${message.content}`)
  },
})

const user = new UserProxyAgent({
  name: '🧑',
  provider,
  systemMessage:
    'You are a human assistant. Reply "TERMINATE" in the end when there is a correct answer.',
  onMessageReceived(message, sender) {
    console.log(`${sender.name}: ${message.content}`)
  },
})

await user.initiateChat(assistant, 'how much is 2 + 2?')

console.timeEnd('🚀 finishing')

// const response = await openai.chat.completions.create({
//   model: "gpt-3.5-turbo",
//   stream: true,
//   messages: [
//   ],
// functions: [
//   {
//     name: "get_weather",
//     description: "Gets the weather in a given city.",
//     parameters: {
//       type: "object",
//       properties: {
//         city: {
//           type: "string",
//           description: "The city to get the weather for.",
//         },
//       },
//     }
//   }
// ]
// });
