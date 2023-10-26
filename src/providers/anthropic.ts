import Anthropic, {ClientOptions} from '@anthropic-ai/sdk'
import debug from 'debug'

import {FunctionDefinition} from '../aibitat.ts'
import {
  APIError,
  AuthorizationError,
  RateLimitError,
  ServerError,
  UnknownError,
} from '../error.ts'
import {Message} from '../types.ts'
import {AIProvider} from './ai-provider.ts'

const log = debug('autogen:provider:anthropic')

/**
 * The model to use for the Anthropic API.
 */
export type AnthropicModel = Anthropic.CompletionCreateParams['model']

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
   * @default 'claude-2'
   */
  model?: AnthropicModel
}

/**
 * The provider for the OpenAI API.
 * By default, the model is set to 'claude-2'.
 */
export class AnthropicProvider extends AIProvider<Anthropic> {
  private model: AnthropicModel

  constructor(config: AnthropicProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        maxRetries: 3,
      },
      model = 'claude-2',
    } = config

    const client = new Anthropic(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on the received messages.
   *
   * @param messages A list of messages to send to the Anthropic API.
   * @returns The completion.
   */
  async create(
    messages: Message[],
    functions?: FunctionDefinition[],
  ): Promise<string> {
    log(`calling 'anthropic.completions.create' with model '${this.model}'`)

    const response = await this.client.completions.create({
      model: this.model,
      max_tokens_to_sample: 300,
      stream: false,
      prompt: `${Anthropic.HUMAN_PROMPT} 
      
      TODO: build a prompt from the messages and functions
      
      ${Anthropic.AI_PROMPT}`,
    })

    return response.completion
  }
}
