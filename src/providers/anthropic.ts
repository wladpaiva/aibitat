import Anthropic, {ClientOptions} from '@anthropic-ai/sdk'

import type {AIbitat} from '..'
import {RetryError} from '../error.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for the Anthropic Messages API.
 */
type AnthropicModel = Anthropic.MessageCreateParams['model']

/**
 * The configuration for the Anthropic provider.
 */
export type AnthropicProviderConfig = {
  /**
   * The options for the Anthropic client.
   * @default {apiKey: process.env.ANTHROPIC_API_KEY}
   */
  options?: ClientOptions
  /**
   * The model to use for the Anthropic API.
   * @default 'claude-3-5-sonnet-20241022'
   */
  model?: AnthropicModel
}

/**
 * Provider for Anthropic's Messages API.
 * By default, the model is set to 'claude-3-5-sonnet-20241022'.
 */
export class AnthropicProvider extends Provider<Anthropic> {
  private model: AnthropicModel

  constructor(config: AnthropicProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      model = 'claude-3-5-sonnet-20241022',
    } = config

    super(new Anthropic(options))
    this.model = model
  }

  /**
   * Create a completion based on the received messages.
   *
   * @param messages A list of messages to send to the Anthropic API.
   * @returns The completion.
   */
  async complete(messages: Provider.Message[]): Promise<Provider.Completion> {
    const system = messages.find(message => message.role === 'system')?.content
    const conversational = messages.filter(message => message.role !== 'system')
    const formattedMessages = (
      conversational.length > 0
        ? conversational
        : [{role: 'user' as const, content: system ?? ''}]
    ).map(message => ({
      role:
        message.role === 'assistant'
          ? ('assistant' as const)
          : ('user' as const),
      content: message.content ?? '',
    }))

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: formattedMessages,
        ...(conversational.length > 0 && system ? {system} : {}),
      })

      const result = response.content
        .flatMap(block => (block.type === 'text' ? [block.text] : []))
        .join('')

      return {
        result,
        cost: Number.NaN,
      }
    } catch (error) {
      if (
        error instanceof Anthropic.RateLimitError ||
        error instanceof Anthropic.InternalServerError ||
        error instanceof Anthropic.APIError
      ) {
        throw new RetryError(error.message)
      }

      throw error
    }
  }
}
