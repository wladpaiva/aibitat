This project is a fork from the original
[autogen](https://github.com/microsoft/autogen) but done in TypeScript.

# AIbitat - Multi-Agent Conversation framework

AIbitat enables the next-gen LLM applications with a generic multi-agent
conversation framework. It offers customizable and conversable agents that
integrate LLMs, tools, and humans. By automating chat among multiple capable
agents, one can easily make them collectively perform tasks autonomously or with
human feedback, including tasks that require using tools via code.

I took a sightly different approach to the original project. Agents are now
provider agnostic and can be used with any provider that implements the
`AIProvider` interface. Also, it is stateless and can be used in a serverless
environment.

By default, aibitat uses **OpenAI** and **GPT-3.5-TURBO** as the provider for
the conversation and **GPT-4** for predicting the next agent to speak but you
can change it by passing `provider` and `model` to the `AIbitat` constructor or
by setting them on the specific node config.

### Features

- **Multi-agent conversations:** AIbitat agents can communicate with each other
  to solve tasks. This allows for more complex and sophisticated applications
  than would be possible with a single LLM.
- **Customization:** AIbitat agents can be customized to meet the specific needs
  of an application. This includes the ability to choose the LLMs to use, the
  types of human input to allow, and the tools to employ.
- **Human participation:** AIbitat seamlessly allows human participation. This
  means that humans can provide input and feedback to the agents as needed.

## Usage

> For a more complete example, check out the [examples](./examples) folder.

You can install the package:

```bash
# to install bun go to https://bun.sh and follow the instructions
bun install aibitat
```

Create an `.env` file and add your `OPEN_AI_API_KEY`:

```bash
OPEN_AI_API_KEY=...
```

Then create a file called `index.ts` and add the following:

```ts
import {AIbitat} from 'aibitat'
import {cli} from 'aibitat/plugins'

const aibitat = new AIbitat({
  nodes: {
    team: ['math', 'reviewer', 'client'],
  },
  config: {
    client: {
      type: 'assistant',
      interrupt: 'NEVER',
      role: 'You are a human assistant. Reply "TERMINATE" in when there is a correct answer.',
    },
    team: {type: 'manager'},
    math: {type: 'agent', role: 'You do the math.'},
    reviewer: {type: 'agent', role: 'You check to see if its correct'},
  },
}).use(cli())

await aibitat.start({
  from: 'client',
  to: 'team',
  content: 'How much is 2 + 2?',
})
```

Then run:

```bash
bun run index.ts
```

## Roadmap

- [x] **Automated reply with loop prevention.** Chats are kept alive until the
      assistant interrupts the conversation.
- [x] **Group chats.** Agents chat with multiple other agents at the same time
      as if they were in a slack channel. The next agent to reply is the most
      likely to reply based on the conversation.
- [x] **Function execution.** Agents can execute functions and return the result
      to the conversation.
- [ ] **Cache**. Store conversation history in a cache to improve performance
      and reduce the number of API calls.
- [x] **Error handling.** Handle API errors gracefully.
- [ ] **Code execution.** Agents can execute code and return the result to the
      conversation.

### Providers

- [ ] Anthropic
- [ ] Cohere
- [ ] Fireworks.ai
- [ ] Hugging Face
- [x] OpenAI
- [ ] Replicate

## Documentation

Nodes are the agents that will be used in the conversation and how they connect
to each other. The `config` object is used to configure each node.

- `type`: `agent`, `assistant` or `manager`. Agents and managers never interrupt
  conversations by default while assistant always does. Managers don't reply to
  messages. They are used to group other agents.
- `interrupt`: `NEVER`, `ALWAYS`. When `NEVER`, the agent will never interrupt
  the conversation. When `ALWAYS`, the agent will always interrupt the
  conversation. (Note: any of them can interrupt the conversation if they reply
  "INTERRUPT")
- `role`: The role of the agent. It is used to describe the role the agent will
  perform in the chat.
- `maxRounds`: The maximum number of chats an agent or a group will reply to the
  conversation. It is used to prevent loops.

### Listening to events

You can listen to events using the `on` method:

```ts
aibitat.onMessage(({from, to, content}) => console.log(`${from}: ${content}`))
```

The following events are available:

- `onStart`: Called when the chat starts.
- `onError`: Called when there's a known error (see `src/error.ts`). To retry,
  call `.retry()`.
- `onMessage`: Called when a message is added to the chat history.
- `onTerminate`: Called when the conversation is terminated. Generally means
  there is nothing else to do and a new conversation should be started.
- `onInterrupt`: Called when the conversation is interrupted by an agent.
  Generally means the agent has a question or needs help. The conversation can
  be resumed by calling `.continue(feedback)`.

### Functions

Functions are used to execute code and return the result to the conversation. To
use them, add them to the `function` object and add it to the `functions`
property to the node config:

```ts
const aibitat = new AIbitat({
  config: {
    client: {
      type: 'assistant',
      interrupt: 'NEVER',
    },
    reviewer: {type: 'agent', functions: ['doSomething']},
  },
  }
}).function({
  name: 'doSomething',
  description: 'Let me do something for you.',
  parameters: {
    type: 'object',
    properties: {},
  },
  async handler() {
    return '...'
  },
})
```

The results will then be sent to the provider and returned to the conversation.

### Plugins

Plugins are used to extend the functionality of AIbitat. They can be used to add
new features or to integrate with other services. You can create your own
plugins by implementing the `AIbitatPlugin` interface.

To use a plugin, call the `use` method:

```ts
...
import {cli} from 'aibitat/plugins'

const aibitat = new AIbitat({
  ...
}).use(cli())
```

You can also create your own plugin by implementing the `AIbitatPlugin`
interface:

```ts
import {AIbitatPlugin} from 'aibitat'

export function myPlugin(): AIbitatPlugin {
  return {
    name: 'my-plugin',
    setup(aibitat) {
      console.log(`setting up my plugin`)

      aibitat.onMessage(({from, to, content}) => {
        console.log(`${from}: ${content}`)
      })
    },
  }
}
```

## Contributing

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run examples/1-basic.ts
```

> Check out the [examples](./examples) folder for more examples.

This project was created using `bun init` in bun v1.0.3. [Bun](https://bun.sh)
is a fast all-in-one JavaScript runtime.

### Sponsors

- [Every-AI: the largest ai tools directory & marketplace](http://www.every-ai.com)

## License

MIT
