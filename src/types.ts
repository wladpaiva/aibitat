import type OpenAI from 'openai'

import type {Agent} from './agents/agent.ts'

/**
 * OpenAI Chat API message.
 */
export type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
export type Role = OpenAI.Chat.Completions.ChatCompletionMessageParam['role']
export type Callable = (
  messages?: Message[],
  sender?: Agent,
  config?: LlmConfig,
) => Promise<{
  success: boolean
  reply: string | null
}>
export type LlmConfig = {
  // TODO: Add types for this
}
export type HumanInputMode = 'TERMINATE' | 'ALWAYS' | 'NEVER'

export type ReplyFunc = {
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
}

export type MessageXXX = Message & {
  // TODO:
  id: string
  createdAt?: Date
}
