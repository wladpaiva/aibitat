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

    this.defaultProvider = this.createProvider({
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

  async start(message: Chat) {
    const x = {
      ...message,
      state: 'success' as const,
    }

    // chats have no state
    this._chats.push(x)
    this.emitter.emit('message', {
      ...x,
      state: 'success',
    })
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
    // check if the message is for a group
    // if it is, select the next node to chat with from the group
    // and then ask them to reply.
    const fromNode = this.config[message.from]
    const isManager = fromNode.type === 'manager'

    if (isManager) {
      // select a node from the group
      const nextNode = await this.selectNext(message.from)

      if (!nextNode) {
        // TODO: should it throw an error or keep the chat alive when there is no node to chat with in the group?
        // maybe it should wrap up the chat and reply to the original node
        // For now, it will terminate the chat
        this.emitter.emit('terminate', {...message, content: 'TERMINATE'})
        return
      }

      const group = this.nodes[message.from]
      if (!Array.isArray(group)) {
        throw new Error(
          `Group ${message.from} is not defined as an array in your nodes`,
        )
      }

      const {maxRounds = 10} = fromNode
      // get chats only from the group's nodes
      const rounds = this.getHistory({to: message.from}).filter(chat =>
        group.includes(chat.from),
      ).length

      if (rounds < maxRounds) {
        await this.chat({from: nextNode, to: message.from})
      }
      return
    }

    // If it's a direct message, reply to the message
    const reply = await this.reply(message)

    const interrupt =
      this.config[message.to].interrupt ||
      (this.defaultInterrupt || this.config[message.to].type === 'assistant'
        ? 'ALWAYS'
        : 'NEVER')

    if (interrupt === 'ALWAYS') {
      this.emitter.emit('interrupt', {...message, content: reply})
      return
    }

    if (
      reply === 'TERMINATE' ||
      this.hasReachedMaximumRounds(message.from, message.to)
    ) {
      this.emitter.emit('terminate', {...message, content: reply})
      return
    }

    if (keepAlive) {
      // keep the chat alive by replying to the other node
      await this.chat({to: message.from, from: message.to}, true)
    }
  }

  /**
   * Select the next node to chat with from a group.
   * @param manager The manager node.
   * @returns The name of the node to chat with.
   */
  private async selectNext(manager: string) {
    const nodes = this.nodes[manager]
    if (!nodes || !Array.isArray(nodes)) {
      throw new Error(`Group ${manager} not found`)
    }

    if (nodes.length < 3) {
      console.warn(
        `- Group (${manager}) is underpopulated with ${nodes.length} agents. Direct communication would be more efficient.`,
      )
    }

    // FIX: should we remove the last node of the group that chatted with the manager so that it doesn't chat with the same node again?
    const availableNodes = nodes.filter(
      node => !this.hasReachedMaximumRounds(manager, node),
    )

    if (!availableNodes.length) {
      return
    }

    const systemMessage = {
      role: 'system' as const,
      content: `Read the above conversation. Then select the next role to play from: 
${availableNodes.join('\n')} 

Only return the role.`,
    }

    // get the provider that will be used for the manager
    const provider = this.providerForNode(manager)
    const history = this.getHistory({to: manager})

    const messages = [
      ...history.map(c => ({
        content: c.content,
        role: 'user' as const,
      })),
      systemMessage,
    ]

    const name = await provider.create(messages)

    return name
  }

  /**
   * Check if the chat has reached the maximum number of rounds.
   */
  private hasReachedMaximumRounds(from: string, to: string): boolean {
    return this.getHistory({from, to}).length >= this.maxRounds
  }

  /**
   * Get the provider to be used for a node.
   *
   * @param node
   * @returns
   */
  private providerForNode(node: string) {
    const nodeProvider = this.createProvider(this.config[node])
    return nodeProvider || this.defaultProvider
  }

  /**
   * Ask the for the AI provider to generate a reply to the chat.
   *
   * @param chat.to The node that sent the chat.
   * @param chat.from The node that will reply to the chat.
   */
  private async reply({from, to}: {from: string; to: string}) {
    // get the provider for the node that will reply
    const provider = this.providerForNode(from)

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
    this.emitter.emit('message', newChat)

    return content
  }

  public async continue(feedback?: string) {
    const lastChat = this._chats.at(-1)
    if (!lastChat) {
      throw new Error('No chat to continue')
    }

    const {from, to} = lastChat

    if (this.hasReachedMaximumRounds(from, to)) {
      throw new Error('Maximum rounds reached')
    }

    if (feedback) {
      await this.start({
        from: to,
        to: from,
        content: feedback,
      })
    } else {
      await this.chat({from: to, to: from})
    }

    return this
  }

  private getHistory({from, to}: {from?: string; to: string}) {
    return this._chats.filter(chat => {
      const isSuccess = chat.state === 'success'

      // check if the chat is between the two nodes
      const hasSent = chat.from === from && chat.to === to
      const hasReceived = chat.from === to && chat.to === from
      const mutual = hasSent || hasReceived

      // if from is not provided, return all chats to the node
      if (!from) {
        return isSuccess && chat.to === to
      }

      return isSuccess && mutual
    })
  }

  public on(event: 'terminate', listener: (chat: ChatState) => void): this
  public on(event: 'interrupt', listener: (chat: ChatState) => void): this
  public on(event: 'message', listener: (chat: ChatState) => void): this

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
