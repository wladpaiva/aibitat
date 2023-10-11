import {ConversableAgent, OpenAIw} from './conversable-agent'

// const response = await openai.chat.completions.create({
//   model: "gpt-3.5-turbo",
//   stream: true,
//   messages: [
//     {
//       content: "Hello, how are you?",
//       role: "user",
//     },
//   ],
//   // functions: [
//   //   {
//   //     name: "get_weather",
//   //     description: "Gets the weather in a given city.",
//   //     parameters: {
//   //       type: "object",
//   //       properties: {
//   //         city: {
//   //           type: "string",
//   //           description: "The city to get the weather for.",
//   //         },
//   //       },
//   //     }
//   //   }
//   // ]
// });

// const stream = OpenAIStream(response);

// // for await (const chunk of stream) {
// //   process.stdout.write(chunk);
// // }

const ai = new OpenAIw()

const first = new ConversableAgent('🔥', ai)
const second = new ConversableAgent('🔴', ai)
first.send('Hey there', second, true)

// TODO: 1. Configuration
// TODO: 2. generate_function_call_reply
// TODO: 3. check_termination_and_human_reply
// TODO: 4. Cache
// TODO: 5. UserProxy
// TODO: 6. Assistant
// TODO: 7. Group
// TODO: 8. GroupManager

console.log('🔥 ~ first.chatMessages', first.chatMessages.get(second))
console.log('🔥 ~ second.chatMessages', second.chatMessages.get(first))
