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

const mathematician = new AssistantAgent({
  name: 'mathematician',
  systemMessage:
    "You are a mathematician and only solve math problems. Don't review the result neither calculate anything else.",
  provider,
  onMessageReceived,
})
const pr = new AssistantAgent({
  name: 'reviewer',
  systemMessage:
    'You are a peer-reviewer. Check the result from mathematician and then give to client. Just confirm, no talk. Do not revisit the problem.',
  provider,
  onMessageReceived,
})

const proxy = new UserProxyAgent({
  name: 'client',
  systemMessage:
    'You do not review neither solve math problems. You can also ask for reviewer to review the result. Reply "TERMINATE" in the end when everything is done.',
  provider,
  onMessageReceived,
})

const group = new GroupChat([mathematician, pr, proxy])

const manager = new GroupChatManager({
  group,
  provider,
  onMessageReceived,
})

await proxy.initiateChat(manager, '2 + 2 = ?')

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
