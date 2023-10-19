import {EventEmitter} from 'events'
import chalk from 'chalk'
import debug from 'debug'

import {
  APIError,
  AuthorizationError,
  RateLimitError,
  ServerError,
  UnknownError,
} from './error.ts'
import {
  AIProvider,
  OpenAIProvider,
  type OpenAIModel,
} from './providers/index.ts'
import {Message} from './types.ts'

const log = debug('autogen:chat-aibitat')

export type ProviderConfig =
  | {
      /** The OpenAI API provider */
      provider?: 'openai'
      /** The model to use with the OpenAI */
      model?: OpenAIModel
    }
  | {
      /** The custom AI provider */
      provider: AIProvider<unknown>
    }

/**
 * Base config for AIbitat nodes.
 */
export type BaseNodeConfig = ProviderConfig & {
  /** The role this node will play in the conversation */
  role?: string
  /**
   * When the chat should be interrupted for feedbacks.
   *
   * - `assistant` nodes will ALWAYS interrupt the chat by default.
   * - `manager` nodes will NEVER interrupt the chat by default.
   * - `agent` nodes will NEVER interrupt the chat by default.
   */
  interrupt?: 'NEVER' | 'ALWAYS'
}

/**
 * Agents are fully autonomous and can solve tasks with LLM.
 */
export type Agent = BaseNodeConfig & {
  /** The type of the node */
  type: 'agent'
}

/**
 * Managers are designed to take care of a group of agents.
 */
export type Manager = BaseNodeConfig & {
  /** The type of the node */
  type: 'manager'

  /**
   * The maximum number of rounds a group will talk to each member
   * @default 10
   */
  maxRounds?: number
}

/**
 * Assistants are designed to solve a task with LLM and interrupt the chat
 * when he understands that the task is completed.
 */
export type Assistant = BaseNodeConfig & {
  /** The type of the node */
  type: 'assistant'
}

/**
 * A Node config for AIbitat.
 */
export type NodeConfig = Agent | Manager | Assistant

/**
 * Configuration for all Nodes in AIbitat.
 */
export type Config = {
  // TODO: Add types for this
  [x: string]: NodeConfig
  //   [K in keyof typeof config.config]: NodeConfig
}

/**
 * A list of nodes and their corresponding connections.
 *
 * String values are interpreted as the name of the node.
 * Array values are interpreted as a group of nodes.
 */
type Nodes = {
  [K in keyof Config]: string | string[]
}

/**
 * A chat message.
 */
type Chat = {
  from: string
  to: string
  content: string
}

/**
 * A chat message that is saved in the history.
 */
type ChatState = Omit<Chat, 'content'> & {
  content?: string
  state: 'success' | 'interrupt' | 'error'
}

/**
 * Chat history.
 */
type History = Array<ChatState>

/**
 * AIbitat props.
 */
export type AIbitatProps = ProviderConfig & {
  /**
   * The nodes and their connections.
   */
  nodes: Nodes

  /**
   * The configuration for all nodes.
   */
  config: Config

  /**
   * Chat history between all nodes.
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
 * Plugin to use with the aibitat
 */
export type AIbitatPlugin = {
  name: string
  setup: (aibitat: AIbitat) => void
}

/**
 * AIbitat is a class that manages the conversation between agents.
 * It is designed to solve a task with LLM.
 *
 * Guiding the chat through a graph of nodes.
 */
export class AIbitat {
  private emitter = new EventEmitter()

  private defaultProvider: AIProvider<unknown>
  private defaultInterrupt: AIbitatProps['interrupt']
  private maxRounds: number

  private _chats: History
  private nodes: Nodes
  private config: Config

  constructor(props: AIbitatProps) {
    const {
      nodes,
      config,
      chats = [],
      interrupt,
      maxRounds = 100,
      provider = 'openai',
      ...rest
    } = props
    this._chats = chats
    this.nodes = nodes
    this.config = config
    this.defaultInterrupt = interrupt
    this.maxRounds = maxRounds

    this.defaultProvider = this.getProviderFromConfig({
      provider,
      ...rest,
    })!
  }

  /**
   * Get the chat history between all nodes.
   */
  get chats() {
    return this._chats
  }

  /**
   * Install a plugin.
   */
  use(plugin: AIbitatPlugin) {
    plugin.setup(this)
    return this
  }

  /**
   * Get the specific node configuration.
   *
   * @param node The name of the node.
   * @throws When the node configuration is not found.
   * @returns The node configuration.
   */
  private getNodeConfig(node: string) {
    const config = this.config[node]
    if (!config) {
      throw new Error(`Node configuration "${node}" not found`)
    }
    return config
  }

  /**
   * Get the connections of a node.
   *
   * @param node The name of the node.
   * @throws When the node connections are not found.
   * @returns The node connections.
   */
  private getNodeConnections(node: string) {
    const connections = this.nodes[node]
    if (!connections) {
      throw new Error(`Node connections "${node}" not found`)
    }
    return connections
  }

  /**
   * Get the members of a group.
   * @throws When the group is not defined as an array in the connections.
   * @param node The name of the group.
   * @returns The members of the group.
   */
  private getGroupMembers(node: string) {
    const group = this.getNodeConnections(node)

    if (!Array.isArray(group)) {
      throw new Error(
        `Group ${node} is not defined as an array in your connections`,
      )
    }

    return group
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
  public onInterrupt(listener: (chat: {from: string; to: string}) => void) {
    this.emitter.on('interrupt', listener)
    return this
  }

  /**
   * Interruption the chat.
   *
   * @param chat The nodes that participated in the interruption.
   * @returns
   */
  private interrupt(chat: {from: string; to: string}) {
    this._chats.push({
      ...chat,
      state: 'interrupt',
    })
    this.emitter.emit('interrupt', chat, this)
  }

  /**
   * Triggered when a message is added to the chat history.
   * This can either be the first message or a reply to a message.
   *
   * @param listener
   * @returns
   */
  public onMessage(listener: (chat: ChatState) => void) {
    this.emitter.on('message', listener)
    return this
  }

  /**
   * Register a new successful message in the chat history.
   * This will trigger the `onMessage` event.
   *
   * @param message
   */
  private newMessage(message: {from: string; to: string; content: string}) {
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
      {}: {from: string; to: string},
    ) => void,
  ) {
    this.emitter.on('replyError', listener)
    return this
  }

  /**
   * Register an error in the chat history.
   * This will trigger the `onError` event.
   *
   * @param message
   */
  private newError(message: {from: string; to: string}, error: unknown) {
    const chat = {
      ...message,
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
  public onStart(listener: (chat: ChatState, aibitat: AIbitat) => void) {
    this.emitter.on('start', listener)
    return this
  }

  /**
   * Start a new chat.
   *
   * @param message The message to start the chat.
   */
  public async start(message: Chat) {
    log(
      `starting a chat from ${chalk.yellow(message.from)} to ${chalk.yellow(
        message.to,
      )} with ${chalk.green(message.content)}`,
    )

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
   * @param chat The nodes that are going to participate in the chat.
   * @param keepAlive Whether to keep the chat alive.
   */
  private async chat(message: {from: string; to: string}, keepAlive = true) {
    log(
      `executing a chat from ${chalk.yellow(message.from)} to ${chalk.green(
        message.to,
      )}`,
    )

    // check if the message is for a group
    // if it is, select the next node to chat with from the group
    // and then ask them to reply.
    const fromNode = this.getNodeConfig(message.from)

    if (fromNode.type === 'manager') {
      // select a node from the group
      const nextNode = await this.selectNext(message.from)

      if (!nextNode) {
        // TODO: should it throw an error or keep the chat alive when there is no node to chat with in the group?
        // maybe it should wrap up the chat and reply to the original node
        // For now, it will terminate the chat
        this.terminate(message.from)
        return
      }

      const nextChat = {
        from: nextNode,
        to: message.from,
      }

      if (this.shouldNodeInterrupt(nextNode)) {
        this.interrupt(nextChat)
        return
      }

      // get chats only from the group's nodes
      const history = this.getHistory({to: message.from})
      const group = this.getGroupMembers(message.from)
      const rounds = history.filter(chat => group.includes(chat.from)).length

      // TODO: maybe this default should be defined somewhere else
      const {maxRounds = 10} = fromNode
      if (rounds >= maxRounds) {
        this.terminate(message.to)
        return
      }

      await this.chat(nextChat)
      return
    }

    // If it's a direct message, reply to the message
    let reply: string
    try {
      reply = await this.reply(message)
    } catch (error: unknown) {
      if (error instanceof APIError) {
        return this.newError({from: message.from, to: message.to}, error)
      }
      throw error
    }

    if (
      reply === 'TERMINATE' ||
      this.hasReachedMaximumRounds(message.from, message.to)
    ) {
      this.terminate(message.to)
      return
    }

    const newChat = {to: message.from, from: message.to}

    if (reply === 'INTERRUPT' || this.shouldNodeInterrupt(message.to)) {
      this.interrupt(newChat)
      return
    }

    if (keepAlive) {
      // keep the chat alive by replying to the other node
      await this.chat(newChat, true)
    }
  }

  /**
   * Check if the node should interrupt the chat based on its configuration.
   *
   * @param node
   * @returns {boolean} Whether the node should interrupt the chat.
   */
  private shouldNodeInterrupt(node: string) {
    const config =
      this.config[node].interrupt ||
      (this.defaultInterrupt || this.config[node].type === 'assistant'
        ? 'ALWAYS'
        : 'NEVER')

    return config === 'ALWAYS'
  }

  /**
   * Select the next node to chat with from a group. The node will be selected based on the history of chats.
   * It will select the node that has not reached the maximum number of rounds yet and has not chatted with the manager in the last round.
   * If it could not determine the next node, it will return a random node.
   *
   * @param manager The manager node.
   * @returns The name of the node to chat with.
   */
  private async selectNext(manager: string) {
    // get all members of the group
    const nodes = this.getGroupMembers(manager)

    // TODO: move this to when the group is created
    // warn if the group is underpopulated
    if (nodes.length < 3) {
      console.warn(
        `- Group (${manager}) is underpopulated with ${nodes.length} agents. Direct communication would be more efficient.`,
      )
    }

    // get the nodes that have not reached the maximum number of rounds
    const availableNodes = nodes.filter(
      node => !this.hasReachedMaximumRounds(manager, node),
    )

    // remove the last node that chatted with the manager so it doesn't chat again
    const lastChat = this._chats.filter(c => c.to === manager).at(-1)
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

    // get the provider that will be used for the manager
    // if the manager has a provider, use that otherwise
    // use the GPT-4 because it has a better reasoning
    const nodeProvider = this.getProviderFromConfig(this.config[manager])
    const provider =
      nodeProvider ||
      this.getProviderFromConfig({provider: 'openai', model: 'gpt-4'})!

    const history = this.getHistory({to: manager})

    // build the messages to send to the provider
    const messages = [
      {
        role: 'system' as const,
        content: this.getRoleContent(manager),
      },
      {
        role: 'user' as const,
        content: `You are in a role play game. The following roles are available:
${availableNodes
  .map(node => `[${node}]: ${this.config[node].role}`)
  .join('\n')}.

Read the following conversation.

CHAT HISTORY
${history.map(c => `[${c.from}]: ${c.content}`).join('\n')}

Then select the next role from that is going to speak next. 
Only return the role.
`,
      },
    ]

    // ask the provider to select the next node to chat with
    // and remove the brackets from the response
    const name = (await provider.create(messages)).replace(/^\[|\]$/g, '')
    if (this.config[name]) {
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
   * @param chat.to The node that sent the chat.
   * @param chat.from The node that will reply to the chat.
   */
  private async reply({from, to}: {from: string; to: string}) {
    // get the provider for the node that will reply
    const nodeProvider = this.getProviderFromConfig(this.getNodeConfig(from))
    const provider = nodeProvider || this.defaultProvider

    const isManager = this.getNodeConfig(to).type === 'manager'

    let chatHistory: Message[]

    // if the node is a manager, send the group chat history to the provider
    // otherwise, send the chat history between the two nodes
    if (isManager) {
      chatHistory = [
        {
          role: 'user',
          content: `You are in a whatsapp group. Read the following conversation and then reply. 
Do not add introduction or conclusion to your reply because this will be a continuous conversation. Don't introduce yourself.

CHAT HISTORY
${this.getHistory({to})
  .map(c => `[${c.from}]: ${c.content}`)
  .join('\n')}

[${from}]:
`,
        },
      ]
    } else {
      chatHistory = this.getHistory({from, to}).map(c => ({
        content: c.content,
        role: c.from === to ? ('user' as const) : ('assistant' as const),
      }))
    }

    // build the messages to send to the provider
    const messages: Message[] = [
      {
        content: this.getRoleContent(from),
        role: 'system' as const,
      },
      // get the history of chats between the two nodes
      ...chatHistory,
    ]

    // get the chat completion
    const content = await provider.create(messages)
    this.newMessage({from, to, content})

    return content
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
  private getProviderFromConfig(config: ProviderConfig) {
    if (typeof config.provider === 'string') {
      switch (config.provider) {
        case 'openai':
          return new OpenAIProvider({model: config.model})

        default:
          throw new Error(
            `Unknown provider: ${config.provider}. Please use "openai"`,
          )
      }
    }

    if (config.provider) {
      return config.provider
    }
  }

  /**
   * Get the role content of a node based on its configuration.
   * @param node
   * @returns
   */
  private getRoleContent(node: string) {
    const n = this.config[node]

    if (n.role) {
      return n.role
    }

    switch (n.type) {
      case 'assistant':
        return 'You are a helpful AI Assistant'
      case 'manager':
        return 'Group chat manager.'
      default:
        return `You are a helpful AI assistant.
Solve tasks using your coding and language skills.
In the following cases, suggest python code (in a python coding block) or shell script (in a sh coding block) for the user to execute.
    1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
    2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.
Solve the task step by step if you need to. If a plan is not provided, explain your plan first. Be clear which step uses code, and which step uses your language skill.
When using code, you must indicate the script type in the code block. The user cannot provide any other feedback or perform any other action beyond executing the code you suggest. The user can't modify your code. So do not suggest incomplete code which requires users to modify. Don't use a code block if it's not intended to be executed by the user.
If you want the user to save the code in a file before executing it, put # filename: <filename> inside the code block as the first line. Don't include multiple code blocks in one response. Do not ask users to copy and paste the result. Instead, use 'print' function for the output when relevant. Check the execution result returned by the user.
If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.
When you find an answer, verify the answer carefully. Include verifiable evidence in your response if possible.
Reply "TERMINATE" when everything is done.`
    }
  }
}
