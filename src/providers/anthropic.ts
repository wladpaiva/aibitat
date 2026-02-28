import Anthropic from '@anthropic-ai/sdk'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Anthropic API using Messages API.
 */
type AnthropicModel =
  | 'claude-3-5-sonnet-20240229'
  | 'claude-3-5-sonnet-20240620'

/**
 * The configuration for Anthropic provider.
 */
export type AnthropicProviderConfig = {
  /**
   * The API key for Anthropic.
   * @default process.env.ANTHROPIC_API_KEY
   */
  apiKey?: string

  /**
   * The model to use for Anthropic.
   * @default 'claude-3-5-sonnet-20240229'
   */
  model?: AnthropicModel
}

/**
 * The provider for Anthropic API using Messages API.
 */
export class AnthropicMessagesProvider extends Provider<Anthropic> {
  private model: AnthropicModel

  constructor(config: AnthropicProviderConfig = {}) {
    const client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
    })

    super(client)

    this.model = config.model || 'claude-3-5-sonnet-20240229'
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Anthropic.
   * @param functions
   * @returns The completion.
   */
  async complete(
    messages: Provider.Message[],
    functions?: AIbitat.FunctionDefinition[],
  ): Promise<Provider.Completion> {
    try {
      // Convert messages to Anthropic Messages API format
      const anthropicMessages = messages.map(message => ({
        role: message.role as 'user' | 'assistant',
        content: message.content || '',
      }))

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: anthropicMessages,
      })

      const completion = (response.content[0] as any)?.text || ''
      const cost = this.getCost(response.usage)

      // Handle function calls
      if (response.stop_reason === 'tool_use' && response.content.length > 0) {
        // Find tool use block
        const toolUseBlock = response.content.find(
          (block: any) => block && block.type === 'tool_use',
        ) as any
        if (toolUseBlock) {
          return {
            result: null,
            functionCall: {
              name: toolUseBlock.name,
              arguments: toolUseBlock.input,
            },
            cost,
          }
        }
      }

      return {
        result: completion,
        cost,
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error)
      throw error
    }
  }

  /**
   * Get cost of completion.
   * Note: Anthropic pricing may vary, this is an estimation.
   *
   * @param usage The completion usage to get cost for.
   * @returns The cost of the completion.
   */
  getCost(usage: Anthropic.Usage): number {
    // Simplified cost estimation (in USD)
    // Actual pricing may vary based on model and plan
    return (
      (usage.input_tokens * 0.000003 + usage.output_tokens * 0.000015) / 1000
    )
  }
}
