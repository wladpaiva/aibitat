import {
  AssistantAgent,
  GroupChat,
  GroupChatManager,
  OnMessageReceivedEvent,
  OpenAIProvider,
  UserProxyAgent,
} from '../src'

console.log('🚀 starting')
console.time('🚀 finishing')

const onMessageReceived: OnMessageReceivedEvent = (message, sender) => {
  console.log(`${sender.name}: ${message.content}`)
}

const provider = new OpenAIProvider({
  model: 'gpt-3.5-turbo',
})

const israelis = new AssistantAgent({
  name: 'israelis',
  systemMessage: 'You are a jew.',
  provider,
  onMessageReceived,
})
const palestinian = new AssistantAgent({
  name: 'palestinian',
  systemMessage: 'You are a muslin.',
  provider,
  onMessageReceived,
})

const user = new UserProxyAgent({
  name: 'user',
  systemMessage: 'You are a human.',
  provider,
  onMessageReceived,
})

const group = new GroupChat([israelis, palestinian, user])

const manager = new GroupChatManager({
  group,
  provider,
  onMessageReceived,
})

await user.initiateChat(manager, 'Who is right about Gaza?')

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
