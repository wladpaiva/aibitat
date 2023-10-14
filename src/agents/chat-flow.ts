import {EventEmitter} from 'events'

import {
  AIProvider,
  OpenAIProvider,
  type OpenAIModel,
} from '../providers/index.ts'
import {Message} from '../types.ts'

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
 * Base config for ChatFlow nodes.
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
  type: 'agent'
}

/**
 * Managers are designed to take care of a group of agents.
 */
export type Manager = BaseNodeConfig & {
  type: 'manager'

  /** The maximum number of rounds a group will talk to each member */
  maxRounds?: number
}

/**
 * Assistants are designed to solve a task with LLM and interrupt the chat
 * when he understands that the task is completed.
 */
export type Assistant = BaseNodeConfig & {
  type: 'assistant'
}

/**
 * A Node config for ChatFlow.
 */
export type NodeConfig = Agent | Manager | Assistant

/**
 * Configuration for all Nodes in ChatFlow.
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
  [K in keyof Config]: string
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
type ChatState = Chat & {
  state: 'loading' | 'error' | 'success'
}

/**
 * Chat history.
 */
type History = Array<ChatState>

/**
 * ChatFlow props.
 */
export type ChatFlowProps = ProviderConfig & {
  nodes: Nodes
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
 * ChatFlow is a class that manages the flow of a chat.
 * It is designed to solve a task with LLM.
 *
 * Guiding the chat through a flow of nodes.
 */
export class ChatFlow {
  private emitter = new EventEmitter()

  private defaultProvider: AIProvider<unknown>
  private defaultInterrupt: ChatFlowProps['interrupt']
  private maxRounds: number

  private _chats: History
  private nodes: Nodes
  private config: Config

  constructor(props: ChatFlowProps) {
    const {nodes, config, chats = [], interrupt, maxRounds = 100} = props
    this._chats = chats
    this.nodes = nodes
    this.config = config
    this.defaultInterrupt = interrupt
    this.defaultProvider = this.createProvider(props)!
    this.maxRounds = maxRounds
  }

  /**
   * Get the chat history between all nodes.
   */
  get chats() {
    return this._chats
  }

  async start(message: Chat) {
    const x = {
      ...message,
      state: 'success' as const,
    }

    // chats have no state
    this._chats.push(x)
    // TODO: this.emitter.emit('chat', x)
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
  private async chat({from, to}: {from: string; to: string}, keepAlive = true) {
    const reply = await this.reply({from, to})

    const interrupt =
      this.config[to].interrupt ||
      (this.defaultInterrupt || this.config[to].type === 'assistant'
        ? 'ALWAYS'
        : 'NEVER')

    if (interrupt === 'ALWAYS') {
      this.emitter.emit('interrupt', {from, to, content: reply})
      return
    }

    if (reply === 'TERMINATE' || this.hasReachedMaximumRounds(from, to)) {
      return
    }

    if (keepAlive) {
      // keep the chat alive by replying to the other node
      await this.chat({to: from, from: to}, true)
    }
  }

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
    const nodeProvider = this.createProvider({
      ...this.config[from],
    })
    const provider = nodeProvider || this.defaultProvider

    // build the messages to send to the provider
    const messages: Message[] = [
      {
        content: this.getRoleContent(from),
        role: 'system' as const,
      },
      // get the history of chats between the two nodes
      ...this.getHistory({from, to}).map(c => ({
        content: c.content,
        role: c.from == to ? ('user' as const) : ('assistant' as const),
      })),
    ]

    const newChat: ChatState = {
      from,
      to,
      content: '',
      state: 'loading',
    }
    this._chats.push(newChat)

    // get the chat completion
    const content = await provider.create(messages)
    // TODO: add error handling

    newChat.content = content
    newChat.state = 'success'
    this.emitter.emit('reply', newChat)

    return content
  }

  public continue(feedback?: string) {
    const lastChat = this._chats.at(-1)
    if (!lastChat) {
      throw new Error('No chat to continue')
    }

    const {from, to} = lastChat
    if (!this.hasReachedMaximumRounds(from, to)) {
      if (feedback) {
        return this.start({
          from: to,
          to: from,
          content: feedback,
        })
      }

      return this.chat({from: to, to: from})
    }
  }

  private getHistory({from, to}: {from: string; to: string}) {
    return this._chats.filter(chat => {
      const isSuccess = chat.state == 'success'

      const hasSent = chat.from == from && chat.to == to
      const hasReceived = chat.from == to && chat.to == from
      const mutual = hasSent || hasReceived

      return isSuccess && mutual
    })
  }

  public on(event: 'interrupt', listener: (chat: ChatState) => void): this
  public on(event: 'reply', listener: (chat: ChatState) => void): this

  /**
   *
   * @param event
   * @param listener
   * @returns
   */
  public on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener)
    return this
  }

  /**
   * Get provider based on configurations
   */
  private createProvider(config: ProviderConfig) {
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

    // default role
    let role = ''
    switch (n.type) {
      case 'assistant':
        role = 'You are a helpful AI Assistant'
      case 'manager':
        role = 'Group chat manager.'
      default:
        role = `You are a helpful AI assistant.
Solve tasks using your coding and language skills.
In the following cases, suggest python code (in a python coding block) or shell script (in a sh coding block) for the user to execute.
    1. When you need to collect info, use the code to output the info you need, for example, browse or search the web, download/read a file, print the content of a webpage or a file, get the current date/time, check the operating system. After sufficient info is printed and the task is ready to be solved based on your language skill, you can solve the task by yourself.
    2. When you need to perform some task with code, use the code to perform the task and output the result. Finish the task smartly.
Solve the task step by step if you need to. If a plan is not provided, explain your plan first. Be clear which step uses code, and which step uses your language skill.
When using code, you must indicate the script type in the code block. The user cannot provide any other feedback or perform any other action beyond executing the code you suggest. The user can't modify your code. So do not suggest incomplete code which requires users to modify. Don't use a code block if it's not intended to be executed by the user.
If you want the user to save the code in a file before executing it, put # filename: <filename> inside the code block as the first line. Don't include multiple code blocks in one response. Do not ask users to copy and paste the result. Instead, use 'print' function for the output when relevant. Check the execution result returned by the user.
If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.
When you find an answer, verify the answer carefully. Include verifiable evidence in your response if possible.
Reply "TERMINATE" in the end when everything is done.`
    }

    return role
  }
}
