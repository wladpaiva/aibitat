import {AIProvider} from '../providers/ai-provider.ts'
import {Message} from '../types.ts'
import {Agent} from './agent.ts'
import {
  ConversableAgent,
  type ConversableAgentConfig,
} from './conversable-agent.ts'

type UnknownAgent = ConversableAgent<AIProvider<unknown>>
/**
 * Class representing a GroupChat.
 */
export class GroupChat<T extends UnknownAgent[]> {
  agents: T
  messages: Message[]
  maxRound: number
  adminName: string

  /**
   * Constructor for GroupChat.
   * @param agents List of agents in the group chat.
   * @param messages List of messages in the group chat.
   * @param maxRound Maximum number of rounds, default is 10.
   * @param adminName Name of the admin agent, default is "Admin".
   */
  constructor(
    agents: T,
    messages: Message[] = [],
    maxRound: number = 10,
    adminName: string = 'Admin',
  ) {
    this.agents = agents
    this.messages = messages
    this.maxRound = maxRound
    this.adminName = adminName
  }

  /**
   * Get the names of the agents in the group chat.
   */
  get agentNames() {
    return this.agents.map(agent => agent.name)
  }

  /**
   * Reset the group chat.
   */
  reset(): void {
    this.messages = []
  }

  /**
   * Find the agent by name.
   * @param name Name of the agent to find.
   */
  agentByName(name: string) {
    return this.agents.find(agent => agent.name === name)
  }

  /**
   * Get the next agent in the list.
   * @param agent The current agent.
   */
  private nextConversableAgent(agent: Agent): UnknownAgent {
    return this.agents[
      (this.agentNames.indexOf(agent.name) + 1) % this.agents.length
    ]
  }

  /**
   * Select the speaker message.
   */

  private selectSpeakerMsg() {
    return `You are in a role play game. The following roles are available:
${this.participantRoles}.

Read the following conversation.
Then select the next role from ${this.agentNames} to play. Only return the role.`
  }

  private get participantRoles() {
    return this.agents
      .map(agent => `${agent.name}: ${agent.systemMessage}"`)
      .join('\n')
  }

  /**
   * Select the next speaker.
   */
  async selectSpeaker(lastSpeaker: Agent, selector: UnknownAgent) {
    // TODO: if the system message is set here, we should somehow reset it
    selector.systemMessage = this.selectSpeakerMsg()

    // Warn if GroupChat is underpopulated, without established changing behavior
    const numAgents = this.agentNames.length
    if (numAgents < 3) {
      console.warn(
        `GroupChat is underpopulated with ${numAgents} agents. Direct communication would be more efficient.`,
      )
    }

    const {success, reply: name} = await selector.generateAiReply(
      this.messages.concat([
        {
          role: 'system',
          content: `Read the above conversation. Then select the next role from ${this.agentNames} to play. Only return the role.`,
        },
      ]),
    )

    if (!success) {
      return this.nextConversableAgent(lastSpeaker)
    }

    return this.agentByName(name) || this.nextConversableAgent(lastSpeaker)
  }
}

export type GroupChatManagerConfig<T extends AIProvider<unknown>> = Omit<
  ConversableAgentConfig<T>,
  'name'
> & {
  group: GroupChat<UnknownAgent[]>

  /**
   * Name of the chat manager
   * @default "chat_manager"
   */
  name?: string
}

/**
 * Class representing a GroupChatManager.
 */
export class GroupChatManager<
  T extends AIProvider<unknown>,
> extends ConversableAgent<T> {
  private group: GroupChat<UnknownAgent[]>

  /**
   * Constructor for GroupChatManager.
   * @param config.name Name of the chat manager, default is "chat_manager".
   * @param config.maxConsecutiveAutoReply Maximum number of consecutive auto replies, default is Infinity.
   * @param config.humanInputMode Human input mode, default is "NEVER".
   * @param config.systemMessage System message, default is "Group chat manager."
   */
  constructor(config: GroupChatManagerConfig<T>) {
    const {
      name = 'chat_manager',
      maxConsecutiveAutoReply = Infinity,
      humanInputMode = 'NEVER',
      systemMessage = 'Group chat manager.',
      group,
      ...rest
    } = config

    super({
      name,
      maxConsecutiveAutoReply,
      humanInputMode,
      systemMessage,
      ...rest,
    })

    this.group = group

    // TODO: register_reply is not implemented yet
    this.registerReply({
      trigger: this,
      replyFunc: this.runChat,
    })
  }

  /**
   * Run a group chat.
   * @param messages List of messages, default is null.
   * @param sender Sender agent, default is null.
   */
  async runChat(messages?: Message[], sender?: Agent, config?: unknown) {
    if (!sender) {
      throw new Error('sender is required')
    }

    if (!messages) {
      messages = this.chatMessages.get(sender) || []
    }

    let message: Message | null = messages[messages.length - 1]
    let speaker = sender
    let groupchat = config
    let reply

    for (let index = 0; index < this.group.maxRound; index++) {
      if (!message) {
        continue
      }

      this.group.messages.push({
        ...message,
        name: message.role === 'function' ? 'function' : speaker.name,
      })

      // broadcast the message to all agents except the speaker
      for (const agent of this.group.agents) {
        if (agent !== speaker) {
          await agent.send(message, this, false, true)
        }
      }

      if (index === this.group.maxRound - 1) {
        // the last round
        break
      }

      try {
        // select the next speaker
        speaker = await this.group.selectSpeaker(speaker, this)
        // let the speaker speak
        reply = await speaker.generateReply(undefined, this)
      } catch (error) {
        // let the admin agent speak if interrupted
        if (this.group.adminName in this.group.agentNames) {
          // admin agent is one of the participants
          const agent = this.group.agentByName(this.group.adminName)

          if (!agent) {
            throw new Error('agent not found')
          }

          speaker = agent
          reply = await speaker.generateReply(undefined, this)
        } else {
          // admin agent is not found in the participants
          throw error
        }
      }
      if (reply === null) {
        break
      }
      // The speaker sends the message without requesting a reply
      speaker.send(reply, this, false)
      message = this.getLastMessage(speaker)
    }

    return {
      success: true,
      reply: null,
    } as const
  }
}
