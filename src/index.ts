import {EventEmitter} from 'events'

import {APIError} from './error.ts'
import * as Function from './function.ts'
import * as Providers from './providers'

export * from './providers'

/**
 * Available providers
 */
type Provider = 'openai' | 'anthropic' | Providers.Provider<unknown>

/**
 * The provider config to use for the AI.
 */
export type ProviderConfig<T extends Provider = 'openai'> = T extends 'openai'
  ? {
      /** The OpenAI API provider */
      provider?: 'openai'
      /** The model to use with the OpenAI */
      model?: Providers.OpenAIProviderConfig['model']
    }
  : T extends 'anthropic'
  ? {
      /** The custom AI provider */
      provider: 'anthropic'
      /**
       * The model to use with the Anthropic API.
       * @default 'claude-2'
       */
      model?: Providers.AnthropicProviderConfig['model']
    }
  : {
      /** The custom AI provider */
      provider: Providers.Provider<unknown>
    }

/**
 * Base config for AIbitat agents.
 */
export type AgentConfig<T extends Provider = 'openai'> = ProviderConfig<T> & {
  /** The role this agent will play in the conversation */
  role?: string

  /**
   * When the chat should be interrupted for feedbacks.
   * @default 'NEVER'
   */
  interrupt?: 'NEVER' | 'ALWAYS'

  /**
   * The functions that this agent can call.
   * @default []
   */
  functions?: string[]
}

/**
 * The channel configuration for the AIbitat.
 */
export type ChannelConfig<T extends Provider = 'openai'> = ProviderConfig<T> & {
  /** The role this agent will play in the conversation */
  role?: string

  /**
   * The maximum number of rounds an agent can chat with the channel
   * @default 10
   */
  maxRounds?: number
}

/**
 * A route between two agents or channels.
 */
type Route = {
  from: string
  to: string
}

/**
 * A chat message.
 */
type Message = Prettify<
  Route & {
    content: string
  }
>

// Prettify a type
type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * A chat message that is saved in the history.
 */
type Chat = Omit<Message, 'content'> & {
  content?: string
  state: 'success' | 'interrupt' | 'error'
}

/**
 * Chat history.
 */
type History = Array<Chat>

/**
 * AIbitat props.
 */
export type AIbitatProps<T extends Provider> = ProviderConfig<T> & {
  /**
   * Chat history between all agents.
   * @default []
   */
  chats?: History

  /**
   * The maximum number of rounds to engage in a chat
   * @default 100
   */
  maxRounds?: number

  /**
   * When the chat should be interrupted for feedbacks
   * @default 'NEVER'
   */
  interrupt?: 'NEVER' | 'ALWAYS'
}

/**
 * AIbitat is a class that manages the conversation between agents.
 * It is designed to solve a task with LLM.
 *
 * Guiding the chat through a graph of agents.
 */
export class AIbitat<T extends Provider> {
  private emitter = new EventEmitter()

  private defaultProvider: ProviderConfig<any>
  private defaultInterrupt
  private maxRounds
  private _chats

  private agents = new Map<string, AgentConfig<any>>()
  private channels = new Map<string, {members: string[]} & ChannelConfig<any>>()
  private functions = new Map<string, AIbitat.FunctionConfig>()

  constructor(props: AIbitatProps<T> = {} as AIbitatProps<T>) {
    const {
      chats = [],
      interrupt = 'NEVER',
      maxRounds = 100,
      provider = 'openai',
      ...rest
    } = props
    this._chats = chats
    this.defaultInterrupt = interrupt
    this.maxRounds = maxRounds

    this.defaultProvider = {
      provider,
      ...rest,
    }
  }

  /**
   * Get the chat history between agents and channels.
   */
  get chats() {
    return this._chats
  }

  /**
   * Install a plugin.
   */
  use<T extends Provider>(plugin: AIbitat.Plugin<T>) {
    plugin.setup(this)
    return this
  }

  /**
   * Add a new agent to the AIbitat.
   *
   * @param name
   * @param config
   * @returns
   */
  public agent<T extends Provider>(
    name: string,
    config: AgentConfig<T> = {} as AgentConfig<T>,
  ) {
    this.agents.set(name, config)
    return this
  }

  /**
   * Add a new channel to the AIbitat.
   *
   * @param name
   * @param members
   * @param config
   * @returns
   */
  public channel<T extends Provider>(
    name: string,
    members: string[],
    config: ChannelConfig<T> = {} as ChannelConfig<T>,
  ) {
    this.channels.set(name, {
      members,
      ...config,
    })
    return this
  }

  /**
   * Get the specific agent configuration.
   *
   * @param agent The name of the agent.
   * @throws When the agent configuration is not found.
   * @returns The agent configuration.
   */
  private getAgentConfig(agent: string) {
    const config = this.agents.get(agent)
    if (!config) {
      throw new Error(`Agent configuration "${agent}" not found`)
    }
    return {
      role: 'You are a helpful AI assistant.',
      //       role: `You are a helpful AI assistant.
      // Solve tasks using your coding and language skills.
      // In the following cases, suggest typescript code (in a typescript coding block) or shell script (in a sh coding block) for the user to execute.
      //     1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
      //     2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.
      // Solve the task step by step if you need to. If a plan is not provided, explain your plan first. Be clear which step uses code, and which step uses your language skill.
      // When using code, you must indicate the script type in the code block. The user cannot provide any other feedback or perform any other action beyond executing the code you suggest. The user can't modify your code. So do not suggest incomplete code which requires users to modify. Don't use a code block if it's not intended to be executed by the user.
      // If you want the user to save the code in a file before executing it, put # filename: <filename> inside the code block as the first line. Don't include multiple code blocks in one response. Do not ask users to copy and paste the result. Instead, use 'print' function for the output when relevant. Check the execution result returned by the user.
      // If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.
      // When you find an answer, verify the answer carefully. Include verifiable evidence in your response if possible.
      // Reply "TERMINATE" when everything is done.`,
      ...config,
    }
  }

  /**
   * Get the specific channel configuration.
   *
   * @param channel The name of the channel.
   * @throws When the channel configuration is not found.
   * @returns The channel configuration.
   */
  private getChannelConfig(channel: string) {
    const config = this.channels.get(channel)
    if (!config) {
      throw new Error(`Channel configuration "${channel}" not found`)
    }
    return {
      maxRounds: 10,
      role: '',
      ...config,
    }
  }

  /**
   * Get the members of a group.
   * @throws When the group is not defined as an array in the connections.
   * @param node The name of the group.
   * @returns The members of the group.
   */
  private getGroupMembers(node: string) {
    const group = this.getChannelConfig(node)
    return group.members
  }

  /**
   * Triggered when a chat is terminated. After this, the chat can't be continued.
   *
   * @param listener
   * @returns
   */
  public onTerminate(listener: (node: string) => void) {
    this.emitter.on('terminate', listener)
    return this
  }

  /**
   * Terminate the chat. After this, the chat can't be continued.
   *
   * @param node Last node to chat with
   */
  private terminate(node: string) {
    this.emitter.emit('terminate', node, this)
  }

  /**
   * Triggered when a chat is interrupted by a node.
   *
   * @param listener
   * @returns
   */
  public onInterrupt(listener: (route: Route) => void) {
    this.emitter.on('interrupt', listener)
    return this
  }

  /**
   * Interruption the chat.
   *
   * @param route The nodes that participated in the interruption.
   * @returns
   */
  private interrupt(route: Route) {
    this._chats.push({
      ...route,
      state: 'interrupt',
    })
    this.emitter.emit('interrupt', route, this)
  }

  /**
   * Triggered when a message is added to the chat history.
   * This can either be the first message or a reply to a message.
   *
   * @param listener
   * @returns
   */
  public onMessage(listener: (chat: Chat) => void) {
    this.emitter.on('message', listener)
    return this
  }

  /**
   * Register a new successful message in the chat history.
   * This will trigger the `onMessage` event.
   *
   * @param message
   */
  private newMessage(message: Message) {
    const chat = {
      ...message,
      state: 'success' as const,
    }

    this._chats.push(chat)
    this.emitter.emit('message', chat, this)
  }

  /**
   * Triggered when an error occurs during the chat.
   *
   * @param listener
   * @returns
   */
  public onError(
    listener: (
      /**
       * The error that occurred.
       *
       * Native errors are:
       * - `APIError`
       * - `AuthorizationError`
       * - `UnknownError`
       * - `RateLimitError`
       * - `ServerError`
       */
      error: unknown,
      /**
       * The message when the error occurred.
       */
      {}: Route,
    ) => void,
  ) {
    this.emitter.on('replyError', listener)
    return this
  }

  /**
   * Register an error in the chat history.
   * This will trigger the `onError` event.
   *
   * @param route
   * @param error
   */
  private newError(route: Route, error: unknown) {
    const chat = {
      ...route,
      content: error instanceof Error ? error.message : String(error),
      state: 'error' as const,
    }
    this._chats.push(chat)
    this.emitter.emit('replyError', error, chat)
  }

  /**
   * Triggered when a chat is interrupted by a node.
   *
   * @param listener
   * @returns
   */
  public onStart<T extends Provider>(
    listener: (chat: Chat, aibitat: AIbitat<T>) => void,
  ) {
    this.emitter.on('start', listener)
    return this
  }

  /**
   * Start a new chat.
   *
   * @param message The message to start the chat.
   */
  public async start(message: Message) {
    // register the message in the chat history
    this.newMessage(message)
    this.emitter.emit('start', message, this)

    // ask the node to reply
    await this.chat({
      to: message.from,
      from: message.to,
    })

    return this
  }

  /**
   * Recursively chat between two nodes.
   *
   * @param route
   * @param keepAlive Whether to keep the chat alive.
   */
  private async chat(route: Route, keepAlive = true) {
    // check if the message is for a group
    // if it is, select the next node to chat with from the group
    // and then ask them to reply.
    if (this.channels.get(route.from)) {
      // select a node from the group
      let nextNode: string | undefined
      try {
        nextNode = await this.selectNext(route.from)
      } catch (error: unknown) {
        if (error instanceof APIError) {
          return this.newError({from: route.from, to: route.to}, error)
        }
        throw error
      }

      if (!nextNode) {
        // TODO: should it throw an error or keep the chat alive when there is no node to chat with in the group?
        // maybe it should wrap up the chat and reply to the original node
        // For now, it will terminate the chat
        this.terminate(route.from)
        return
      }

      const nextChat = {
        from: nextNode,
        to: route.from,
      }

      if (this.shouldAgentInterrupt(nextNode)) {
        this.interrupt(nextChat)
        return
      }

      // get chats only from the group's nodes
      const history = this.getHistory({to: route.from})
      const group = this.getGroupMembers(route.from)
      const rounds = history.filter(chat => group.includes(chat.from)).length

      const {maxRounds} = this.getChannelConfig(route.from)
      if (rounds >= maxRounds) {
        this.terminate(route.to)
        return
      }

      await this.chat(nextChat)
      return
    }

    // If it's a direct message, reply to the message
    let reply: string
    try {
      reply = await this.reply(route)
    } catch (error: unknown) {
      if (error instanceof APIError) {
        return this.newError({from: route.from, to: route.to}, error)
      }
      throw error
    }

    if (
      reply === 'TERMINATE' ||
      this.hasReachedMaximumRounds(route.from, route.to)
    ) {
      this.terminate(route.to)
      return
    }

    const newChat = {to: route.from, from: route.to}

    if (
      reply === 'INTERRUPT' ||
      (this.agents.get(route.to) && this.shouldAgentInterrupt(route.to))
    ) {
      this.interrupt(newChat)
      return
    }

    if (keepAlive) {
      // keep the chat alive by replying to the other node
      await this.chat(newChat, true)
    }
  }

  /**
   * Check if the agent should interrupt the chat based on its configuration.
   *
   * @param agent
   * @returns {boolean} Whether the agent should interrupt the chat.
   */
  private shouldAgentInterrupt(agent: string) {
    const config = this.getAgentConfig(agent)
    return this.defaultInterrupt === 'ALWAYS' || config.interrupt === 'ALWAYS'
  }

  /**
   * Select the next node to chat with from a group. The node will be selected based on the history of chats.
   * It will select the node that has not reached the maximum number of rounds yet and has not chatted with the channel in the last round.
   * If it could not determine the next node, it will return a random node.
   *
   * @param channel The name of the group.
   * @returns The name of the node to chat with.
   */
  private async selectNext(channel: string) {
    // get all members of the group
    const nodes = this.getGroupMembers(channel)
    const channelConfig = this.getChannelConfig(channel)

    // TODO: move this to when the group is created
    // warn if the group is underpopulated
    if (nodes.length < 3) {
      console.warn(
        `- Group (${channel}) is underpopulated with ${nodes.length} agents. Direct communication would be more efficient.`,
      )
    }

    // get the nodes that have not reached the maximum number of rounds
    const availableNodes = nodes.filter(
      node => !this.hasReachedMaximumRounds(channel, node),
    )

    // remove the last node that chatted with the channel, so it doesn't chat again
    const lastChat = this._chats.filter(c => c.to === channel).at(-1)
    if (lastChat) {
      const index = availableNodes.indexOf(lastChat.from)
      if (index > -1) {
        availableNodes.splice(index, 1)
      }
    }

    if (!availableNodes.length) {
      // TODO: what should it do when there is no node to chat with?
      return
    }

    // get the provider that will be used for the channel
    // if the channel has a provider, use that otherwise
    // use the GPT-4 because it has a better reasoning
    const provider = this.getProviderForConfig({
      // @ts-expect-error
      model: 'gpt-4',
      ...this.defaultProvider,
      ...channelConfig,
    })
    const history = this.getHistory({to: channel})

    // build the messages to send to the provider
    const messages = [
      {
        role: 'system' as const,
        content: channelConfig.role,
      },
      {
        role: 'user' as const,
        content: `You are in a role play game. The following roles are available:
${availableNodes
  .map(node => `@${node}: ${this.getAgentConfig(node).role}`)
  .join('\n')}.

Read the following conversation.

CHAT HISTORY
${history.map(c => `@${c.from}: ${c.content}`).join('\n')}

Then select the next role from that is going to speak next. 
Only return the role.
`,
      },
    ]

    // ask the provider to select the next node to chat with
    // and remove the @ from the response
    const {result} = await provider.complete(messages)
    const name = result!.replace(/^@/g, '')
    if (this.agents.get(name)) {
      return name
    }

    // if the name is not in the nodes, return a random node
    return availableNodes[Math.floor(Math.random() * availableNodes.length)]
  }

  /**
   * Check if the chat has reached the maximum number of rounds.
   */
  private hasReachedMaximumRounds(from: string, to: string): boolean {
    return this.getHistory({from, to}).length >= this.maxRounds
  }

  /**
   * Ask the for the AI provider to generate a reply to the chat.
   *
   * @param route.to The node that sent the chat.
   * @param route.from The node that will reply to the chat.
   */
  private async reply(route: Route) {
    // get the provider for the node that will reply
    const fromConfig = this.getAgentConfig(route.from)

    const chatHistory =
      // if it is sending message to a group, send the group chat history to the provider
      // otherwise, send the chat history between the two nodes
      this.channels.get(route.to)
        ? [
            {
              role: 'user' as const,
              content: `You are in a whatsapp group. Read the following conversation and then reply. 
Do not add introduction or conclusion to your reply because this will be a continuous conversation. Don't introduce yourself.

CHAT HISTORY
${this.getHistory({to: route.to})
  .map(c => `@${c.from}: ${c.content}`)
  .join('\n')}

@${route.from}:`,
            },
          ]
        : this.getHistory(route).map(c => ({
            content: c.content,
            role:
              c.from === route.to ? ('user' as const) : ('assistant' as const),
          }))

    // build the messages to send to the provider
    const messages = [
      {
        content: fromConfig.role,
        role: 'system' as const,
      },
      // get the history of chats between the two nodes
      ...chatHistory,
    ]

    // get the functions that the node can call
    const functions = fromConfig.functions
      ?.map(name => this.functions.get(name))
      .filter(a => !!a) as Function.FunctionConfig[] | undefined

    const provider = this.getProviderForConfig({
      ...this.defaultProvider,
      ...fromConfig,
    })

    // get the chat completion
    const content = await this.handleExecution(provider, messages, functions)
    this.newMessage({...route, content})

    return content
  }

  private async handleExecution(
    provider: Providers.Provider<unknown>,
    messages: Providers.Provider.Message[],
    functions?: AIbitat.FunctionDefinition[],
  ): Promise<string> {
    // get the chat completion
    const completion = await provider.complete(messages, functions)

    if (completion.functionCall) {
      const {name, arguments: args} = completion.functionCall
      const fn = this.functions.get(name)

      // if provider hallucinated on the function name
      // ask the provider to complete again
      if (!fn) {
        return await this.handleExecution(
          provider,
          [
            ...messages,
            {
              name,
              role: 'function',
              content: `Function "${name}" not found. Try again.`,
            },
          ],
          functions,
        )
      }

      // Execute the function and return the result to the provider
      const result = await fn.handler(args)
      return await this.handleExecution(
        provider,
        [
          ...messages,
          {
            name,
            role: 'function',
            content: result,
          },
        ],
        functions,
      )
    }

    return completion.result!
  }

  /**
   * Continue the chat from the last interruption.
   * If the last chat was not an interruption, it will throw an error.
   * Provide a feedback where it was interrupted if you want to.
   *
   * @param feedback The feedback to the interruption if any.
   * @returns
   */
  public async continue(feedback?: string | null) {
    const lastChat = this._chats.at(-1)
    if (!lastChat || lastChat.state !== 'interrupt') {
      throw new Error('No chat to continue')
    }

    // remove the last chat's that was interrupted
    this._chats.pop()

    const {from, to} = lastChat

    if (this.hasReachedMaximumRounds(from, to)) {
      throw new Error('Maximum rounds reached')
    }

    if (feedback) {
      const message = {
        from,
        to,
        content: feedback,
      }

      // register the message in the chat history
      this.newMessage(message)

      // ask the node to reply
      await this.chat({
        to: message.from,
        from: message.to,
      })
    } else {
      await this.chat({from, to})
    }

    return this
  }

  /**
   * Retry the last chat that threw an error.
   * If the last chat was not an error, it will throw an error.
   */
  public async retry() {
    const lastChat = this._chats.at(-1)
    if (!lastChat || lastChat.state !== 'error') {
      throw new Error('No chat to retry')
    }

    // remove the last chat's that threw an error
    const {from, to} = this._chats.pop()!

    await this.chat({from, to})
    return this
  }

  /**
   * Get the chat history between two nodes or all chats to/from a node.
   */
  private getHistory({from, to}: {from?: string; to?: string}) {
    return this._chats.filter(chat => {
      const isSuccess = chat.state === 'success'

      // return all chats to the node
      if (!from) {
        return isSuccess && chat.to === to
      }

      // get all chats from the node
      if (!to) {
        return isSuccess && chat.from === from
      }

      // check if the chat is between the two nodes
      const hasSent = chat.from === from && chat.to === to
      const hasReceived = chat.from === to && chat.to === from
      const mutual = hasSent || hasReceived

      return isSuccess && mutual
    }) as {
      from: string
      to: string
      content: string
      state: 'success'
    }[]
  }

  /**
   * Get provider based on configurations.
   * If the provider is a string, it will return the default provider for that string.
   *
   * @param config The provider configuration.
   */
  private getProviderForConfig<T extends Provider>(config: ProviderConfig<T>) {
    if (typeof config.provider === 'object') {
      return config.provider
    }

    switch (config.provider) {
      case 'openai':
        return new Providers.OpenAIProvider({model: config.model})
      case 'anthropic':
        return new Providers.AnthropicProvider({model: config.model})

      default:
        throw new Error(
          `Unknown provider: ${config.provider}. Please use "openai"`,
        )
    }
  }

  /**
   * Register a new function to be called by the AIbitat agents.
   * You are also required to specify the which node can call the function.
   * @param functionConfig The function configuration.
   */
  public function(
    functionConfig: AIbitat.FunctionConfig | AIbitat.FunctionConfig[],
  ) {
    if (Array.isArray(functionConfig)) {
      functionConfig.map(e => this.function(e))
      return this
    }
    this.functions.set(functionConfig.name, functionConfig)
    return this
  }
}

export namespace AIbitat {
  /**
   * Plugin to use with the aibitat
   */
  export type Plugin<T extends Provider> = {
    /**
     * The name of the plugin. This will be used to identify the plugin.
     * If the plugin is already installed, it will replace the old plugin.
     */
    name: string

    /**
     * The setup function to be called when the plugin is installed.
     */
    setup: (aibitat: AIbitat<T>) => void
  }

  export type FunctionConfig = Function.FunctionConfig
  export type FunctionDefinition = Function.FunctionDefinition
  export type FunctionCall = Function.FunctionCall
}

export default AIbitat
