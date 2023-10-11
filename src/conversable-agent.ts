import {OpenAIStream, StreamingTextResponse} from 'ai'
import OpenAI, {ClientOptions} from 'openai'

import {Agent} from './agent'
import {AgentAI} from './ai'
import type {Callable, LlmConfig, Message, ReplyFunc, Role} from './types'

export class OpenAIw extends AgentAI<OpenAI> {
  constructor(
    opts: ClientOptions = {
      apiKey: process.env.OPENAI_API_KEY,
    },
  ) {
    const client = new OpenAI(opts)

    super(client)
  }

  async create(messages: Message[]) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: messages!,
    })

    const stream = OpenAIStream(response)
    const result = new StreamingTextResponse(stream)
    return await result.text()
  }
}

export class ConversableAgent extends Agent {
  private _messages: Map<Agent, Message[]>
  private replyFuncList: (ReplyFunc & {init_config: unknown})[] = []
  private onMessageReceived?: (message: Message, sender: Agent) => void
  private defaultAutoReply: string
  private agentAI: AgentAI<unknown>

  constructor(
    name: string,
    ai: AgentAI<unknown>,
    config: {
      /**
       * Default auto reply.
       * @default ""
       */
      defaultAutoReply?: string
    } = {},
  ) {
    super(name)

    this.agentAI = ai
    this._messages = new Map<Agent, Message[]>()
    this.onMessageReceived = (message, sender) => {
      console.log(`${sender.name}: ${message.content}`)
    }
    const {defaultAutoReply = ''} = config
    this.defaultAutoReply = defaultAutoReply

    this.registerReply({
      trigger: this,
      replyFunc: this.generateOaiReply,
    })

    // TODO: implement those
    // this.registerReply({
    //   trigger: this,
    //   replyFunc: this.generate_code_execution_reply,
    // });
    // this.registerReply({
    //   trigger: this,
    //   replyFunc: this.generate_function_call_reply,
    // });
    // this.registerReply({
    //   trigger: this,
    //   replyFunc: this.check_termination_and_human_reply,
    // });
  }

  /**
   * Get chat messages.
   * @returns The chat messages.
   */
  get chatMessages() {
    return this._messages
  }

  /**
   * Convert a message to a dictionary. The message can be a string or a dictionary.
   * The string will be put in the "content" field of the new dictionary.
   * @param message The message to convert.
   */
  static messageToDict(message: string | Message) {
    return typeof message === 'string' ? {content: message} : message
  }

  /**
   * Append a message to the ChatCompletion conversation.
   * - If the message received is a string, it will be put in the "content" field of the new dictionary.
   * - If the message received is a dictionary but does not have any of the two fields "content" or "function_call",
   *     this message is not a valid ChatCompletion message.
   * - If only "function_call" is provided, "content" will be set to None if not provided, and the role of the message will be forced "assistant".
   *
   * @param message The message to append.
   * @param role The role of the message.
   * @param agent The agent that sent the message.
   * @returns whether the message is appended to the ChatCompletion conversation.
   */
  public appendOaiMessage(message: string | Message, role: Role, agent: Agent) {
    const converted = ConversableAgent.messageToDict(message)

    // create oai message to be appended to the oai conversation that can be passed to oai directly.
    if (
      !converted.content &&
      (!('function_call' in converted) || !converted.function_call)
    ) {
      return false
    }

    const newMessage: Message = {
      ...converted,
      role:
        'role' in converted && converted.role === 'function'
          ? 'function'
          : 'function_call' in converted && converted.function_call
          ? 'assistant'
          : role,
    }

    if (!this._messages.has(agent)) {
      this._messages.set(agent, [])
    }

    this._messages.get(agent)!.push(newMessage)

    return true
  }

  async send(
    message: string | Message,
    recipient: Agent,
    requestReply?: boolean | undefined,
  ) {
    // When the agent composes and sends the message, the role of the message is "assistant"
    // unless it's "function".
    const valid = this.appendOaiMessage(message, 'assistant', recipient)
    if (!valid) {
      throw new Error(
        "Message can't be converted into a valid ChatCompletion message. Either content or function_call must be provided.",
      )
    }

    await recipient.receive(message, this, requestReply)
  }

  /**
   * When the agent receives a message, the role of the message is "user".
   * (If 'role' exists and is 'function', it will remain unchanged.)
   * @param message
   * @param sender
   */
  private processReceivedMessage(message: string | Message, sender: Agent) {
    const converted = ConversableAgent.messageToDict(message)
    const valid = this.appendOaiMessage(message, 'user', sender)
    if (!valid) {
      throw new Error(
        "Received message can't be converted into a valid ChatCompletion message. Either content or function_call must be provided.",
      )
    }
    this.onMessageReceived?.({role: 'user', ...converted}, sender)
  }

  async receive(
    message: string | Message,
    sender: Agent,
    requestReply?: boolean,
  ) {
    this.processReceivedMessage(message, sender)
    if (!requestReply) {
      return
    }

    const reply = await this.generateReply(
      this.chatMessages.get(sender),
      sender,
    )
    if (reply) {
      await this.send(reply, sender)
    }
  }

  /**
   * Register a reply function.
   *
   * The reply function will be called when the trigger matches the sender.
   * The function registered later will be checked earlier by default.
   * To change the order, set the position to a positive integer.
   */
  public registerReply({
    trigger,
    replyFunc,
    position = 0,
    config,
    resetConfig,
  }: {
    /**
     * The trigger to activate the reply function.
     * - If a class is provided, the reply function will be called when the sender is an instance of the class.
     * - If a string is provided, the reply function will be called when the sender's name matches the string.
     * - If an agent instance is provided, the reply function will be called when the sender is the agent instance.
     * - If a callable is provided, the reply function will be called when the callable returns True.
     * - If a list is provided, the reply function will be called when any of the triggers in the list is activated.
     * - If None is provided, the reply function will be called only when the sender is None.
     * Note: Be sure to register `None` as a trigger if you would like to trigger an auto-reply function with non-empty messages and `sender=None`.
     */
    trigger: string | Agent | Callable | unknown[]
    /**
     * The function takes a recipient agent, a list of messages, a sender agent and a config as input and returns a reply message.
     */
    replyFunc: Callable
    /**
     * The position of the reply function in the reply function list.
     * The function registered later will be checked earlier by default.
     * To change the order, set the position to a positive integer.
     */
    position?: number
    /**
     * The config to be passed to the reply function.
     * When an agent is reset, the config will be reset to the original value.
     */
    config?: LlmConfig
    /**
     * the function to reset the config.
     * The function returns None.
     */
    resetConfig?: Callable
  }) {
    if (!(trigger instanceof (Agent || String || Function || Array))) {
      throw new Error(
        'trigger must be a class, a string, an agent, a callable or a list.',
      )
    }

    this.replyFuncList.splice(position, 0, {
      trigger,
      replyFunc,
      config,
      init_config: config,
      resetConfig,
    })
  }

  /**
   * Reply based on the conversation history and the sender.
   *
   * Either messages or sender must be provided.
   * Register a reply_func with `None` as one trigger for it to be activated when `messages` is non-empty and `sender` is `None`.
   * Use registered auto reply functions to generate replies.
   * By default, the following functions are checked in order:
   * 1. check_termination_and_human_reply
   * 2. generate_function_call_reply
   * 3. generate_code_execution_reply
   * 4. generate_oai_reply
   * Every function returns a tuple (final, reply).
   * When a function returns final=False, the next function will be checked.
   * So by default, termination and human reply will be checked first.
   * If not terminating and human reply is skipped, execute function or code and return the result.
   * AI replies are generated only when no code execution is performed.
   * @param messages a list of messages in the conversation history.
   * @param sender sender of an Agent instance.
   * @param exclude a list of functions to exclude.
   * @returns reply. None if no reply is generated.
   */
  async generateReply(
    messages?: Message[],
    sender?: Agent,
  ): Promise<string | null> {
    if (!messages && !sender) {
      throw new Error('Either messages or sender must be provided.')
    }

    if (!messages) {
      messages = this.chatMessages.get(sender!) || []
    }

    for (const replyFuncTuple of this.replyFuncList) {
      const replyFunc = replyFuncTuple.replyFunc
      if (replyFuncTuple.trigger instanceof Agent) {
        const {success, reply} = await replyFunc(
          messages,
          sender,
          replyFuncTuple.config,
        )
        if (success) {
          return reply
        }
      }
    }

    return this.defaultAutoReply
  }

  /**
   * Generate a reply using `autogen.oai`
   * @param messages
   * @param sender
   * @param config
   */
  public async generateOaiReply(messages?: Message[], sender?: Agent) {
    if (!sender) {
      throw new Error('Sender must be provided.')
    }

    if (!messages) {
      messages = this.chatMessages.get(sender)
    }

    // TODO: return streaming text response
    const reply = await this.agentAI.create(messages!)
    // const reply = ''

    return {
      success: true,
      reply,
    } as const
  }

  reset(): void {
    throw new Error('Method not implemented.')
  }
}
