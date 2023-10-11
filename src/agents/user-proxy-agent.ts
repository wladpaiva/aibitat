import {AIProvider} from '../providers/ai-provider'
import {
  ConversableAgent,
  type ConversableAgentConfig,
} from './conversable-agent'

/**
 * A proxy agent for the user, that can execute code and provide feedback to the other agents.
 *
 * UserProxyAgent is a subclass of ConversableAgent configured with `humanInputMode` to ALWAYS
 * and `llm_config` to False. By default, the agent will prompt for human input every time a message is received.
 * Code execution is enabled by default. LLM-based auto reply is disabled by default.
 * To modify auto reply, register a method with `registerReply`.
 * To modify the way to get human input, override `getHumanInput` method.
 * To modify the way to execute code blocks, single code block, or function call, override `executeCodeBlocks`,
 * `runCode`, and `executeFunction` methods respectively.
 */
export class UserProxyAgent<
  T extends AIProvider<unknown>,
> extends ConversableAgent<T> {
  constructor(config: ConversableAgentConfig<T>) {
    const {
      // humanInputMode = 'ALWAYS',
      ...rest
    } = config

    super({
      ...rest,
    })
  }
}
