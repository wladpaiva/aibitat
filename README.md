This project is a fork from the original
[autogen](https://github.com/microsoft/autogen) but done in TypeScript.

# AIbitat - Multi-Agent Conversation Framework

AIbitat is a stateless & extensible framework designed to enable interaction
between multiple agents while allowing human participation.

Think of it as Slack but for AI agents. Create agents, add them to channels and
let them chat with each other. You can also add intractable agents to channels
and let them participate in the conversation.

## Usage

> For a more complete example, check out the [examples](./examples) folder.

You can install the package:

```bash
# to install bun go to https://bun.sh and follow the instructions
# then run to start a new project:
mkdir my-project
cd my-project
bun init

# then install aibitat
bun install aibitat
```

Create an `.env` file and add your `OPENAI_API_KEY`:

```bash
OPENAI_API_KEY=...
```

Then create a file called `index.ts` and add the following:

```ts
import {AIbitat} from 'aibitat'
import {cli} from 'aibitat/plugins'

const aibitat = new AIbitat()
  .use(cli())
  .agent('client', {
    interrupt: 'ALWAYS',
    role: 'You are a human assistant. Reply "TERMINATE" when there is a correct answer or there`s no answer to the question.',
  })
  .agent('mathematician', {
    role: `You are a Mathematician and only solve math problems from @client`,
  })
  .agent('reviewer', {
    role: `You are a Peer-Reviewer and you do not solve math problems. 
    Check the result from @mathematician and then confirm. Just confirm, no talk.`,
  })
  .channel('management', ['mathematician', 'reviewer', 'client'])

await aibitat.start({
  from: 'client',
  to: 'management',
  content: 'How much is 2 + 2?',
})
```

Then run:

```bash
bun run index.ts
```

## Roadmap

| Feature            | What it does                                           | Status |
| ------------------ | ------------------------------------------------------ | ------ |
| Direct messages    | Agents talk directly with each other.                  | ✅     |
| Feedback           | Keep chat alive until some agent interrupts the chat.  | ✅     |
| Channels           | Agents talk with many others, like in a Slack channel. | ✅     |
| Error handling     | Manage rate limits smoothly without crashing.          | ✅     |
| Function execution | Agents can execute tasks and understand the results.   | ✅     |
| Web browsing       | Navigate on the internet.                              | 🚧     |
| Cache              | Save chat history for faster and fewer API calls.      | 🕝     |
| File interaction   | Interact with local files by read/write/execute        | 🕝     |
| Code execution     | Agents can run code and share the results.             | 🕝     |
| Cost limit         | Limit the number of interactions by cost.              | 🕝     |

### Providers

| Provider     | Status |
| ------------ | ------ |
| OpenAI       | ✅     |
| Anthropic    | 🕝     |
| Cohere       | 🕝     |
| Fireworks.ai | 🕝     |
| Hugging Face | 🕝     |
| Replicate    | 🕝     |

## Documentation

Some terms used in this documentation:

- `interrupt`: `NEVER`, `ALWAYS`. When `NEVER`, the agent will never interrupt
  the conversation. When `ALWAYS`, the agent will always interrupt the
  conversation. (Note: any of them can interrupt the conversation if they reply
  "INTERRUPT" or terminate the chat when replying "TERMINATE".)
- `role`: The role of the agent. It is used to describe the role the agent will
  perform in the chat.
- `maxRounds`: The maximum number of chats an agent or a group will reply to the
  conversation. It is used to prevent loops.

### `new AIbitat(config)`

Creates a new AIbitat instance. The `config` object can be used to configure the
instance. By default, aibitat uses **OpenAI** and **GPT-3.5-TURBO** as the
provider for the conversation and **GPT-4** for predicting the next agent to
speak. You can change it by passing `provider` and `model` to the `AIbitat`
constructor or by setting them on the specific agent/channel config. Default
config:

```js
{
  providers: 'openai',
  model: 'gpt-3.5-turbo',
  interrupt: 'NEVER',
  maxRounds: 100,
  chats: [
    // {
    //   from: '🧑',
    //   to: '🤖',
    //   content: `Talk about something`,
    //   state: 'success',
    // },
  ],
}
```

### `.agent(name, config)`

Creates a new agent. The `config` object can be used to configure the agent. By
default, agents use the `interrupt` from the `AIbitat` config.

### `.channel(name, agents, config)`

Creates a new channel. The `config` object can be used to configure the channel.
By default, `maxRounds` is set to `100`.

### `.function(config)`

Functions are used to execute code and return the result to the conversation. To
use it, call the `function` method passing the definitions for the function and
add its name to the `functions` property to the node config:

```ts
const aibitat = new AIbitat()
  .agent('...', {functions: ['doSomething']})
  .function({
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

### `.use(plugin)`

Plugins are used to extend the functionality of AIbitat. They can be used to add
new features or to integrate with other services. You can create your own plugin
by implementing the `AIbitatPlugin` interface.

To use a plugin, call the `use` method:

```ts
...
import {cli} from 'aibitat/plugins'

const aibitat = new AIbitat().use(cli())
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

**List of available plugins:**

- `cli`: Adds a CLI interaction to the chat.
- `fileHistory`: Saves the chat history to a JSON file. Defaults to `history`
  folder
- `experimental_webBrowsing`: Adds a `web-browsing` function to the chat that
  enable agents to search and navigate on the internet. NOTE: this plugin is
  experimental and may not work as expected.

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
