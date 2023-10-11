import {AIProvider} from '../providers/ai-provider'
import {
  ConversableAgent,
  type ConversableAgentConfig,
} from './conversable-agent'

type AssistantAgentConfig<T extends AIProvider<unknown>> = Omit<
  ConversableAgentConfig<T>,
  'humanInputMode' | 'codeExecutionConfig'
>

/**
 * Assistant agent, designed to solve a task with LLM.
 *
 * AssistantAgent is a subclass of ConversableAgent configured with a default system message.
 * The default system message is designed to solve a task with LLM,
 * including suggesting python code blocks and debugging.
 * `human_input_mode` is default to "NEVER"
 * and `code_execution_config` is default to False.
 * This agent doesn't execute code by default, and expects the user to execute the code.
 */
export class AssistantAgent<
  T extends AIProvider<unknown>,
> extends ConversableAgent<T> {
  /**
   * Default system message for the AssistantAgent.
   */
  static DEFAULT_SYSTEM_MESSAGE = `
        You are a helpful AI assistant...
        (rest of the message)
        ...Reply "TERMINATE" in the end when everything is done.
    `

  constructor(config: AssistantAgentConfig<T>) {
    const {systemMessage = AssistantAgent.DEFAULT_SYSTEM_MESSAGE, ...rest} =
      config

    super({
      systemMessage,
      ...rest,
    })
  }
}
