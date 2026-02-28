import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Fireworks.ai API.
 */
type FireworksModel =
  | 'accounts/fireworks/models/llama-v2-7b-chat'
  | 'accounts/fireworks/models/llama-v2-13b-chat'
  | 'accounts/fireworks/models/mixtral-8x7b-instruct'
  | 'accounts/fireworks/models/qwen-72b-chat'

/**
 * The configuration for Fireworks.ai provider.
 */
export type FireworksProviderConfig = {
  /**
   * The options for Fireworks.ai client (compatible with OpenAI).
   * @default {apiKey: process.env.FIREWORKS_API_KEY, baseURL: "https://api.fireworks.ai/inference/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Fireworks.ai.
   * @default 'accounts/fireworks/models/llama-v2-7b-chat'
   */
  model?: FireworksModel
}

/**
 * The provider for Fireworks.ai API.
 * Uses OpenAI-compatible API.
 */
export class FireworksProvider extends Provider<OpenAI> {
  private model: FireworksModel

  // Cost estimation (approximate, may need adjustment)
  static COST_PER_TOKEN = {
    'accounts/fireworks/models/llama-v2-7b-chat': {
      input: 0.0000009,
      output: 0.0000009,
    },
    'accounts/fireworks/models/llama-v2-13b-chat': {
      input: 0.0000016,
      output: 0.0000016,
    },
    'accounts/fireworks/models/mixtral-8x7b-instruct': {
      input: 0.000002,
      output: 0.000002,
    },
    'accounts/fireworks/models/qwen-72b-chat': {
      input: 0.000007,
      output: 0.000007,
    },
  }

  constructor(config: FireworksProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.FIREWORKS_API_KEY,
        baseURL: 'https://api.fireworks.ai/inference/v1',
        maxRetries: 3,
      },
      model = 'accounts/fireworks/models/llama-v2-7b-chat',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Fireworks.ai.
   * @param functions
   * @returns The completion.
   */
  async complete(
    messages: OpenAI.ChatCompletionMessageParam[],
    functions?: AIbitat.FunctionDefinition[],
  ): Promise<Provider.Completion> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        functions,
      })

      // Right now, we only support one completion,
      // so we just take the first one in the list
      const completion = response.choices[0].message
      const cost = this.getCost(response.usage)

      // Handle function calls
      if (completion.function_call) {
        let functionArgs: object
        try {
          functionArgs = JSON.parse(completion.function_call.arguments)
        } catch (error) {
          // Call complete function again in case it gets a json error
          return this.complete(
            [
              ...messages,
              {
                role: 'function',
                name: completion.function_call.name,
                function_call: completion.function_call,
                content: (error as Error).message,
              },
            ],
            functions,
          )
        }

        return {
          result: null,
          functionCall: {
            name: completion.function_call.name,
            arguments: functionArgs!,
          },
          cost,
        }
      }

      return {
        result: completion.content,
        cost,
      }
    } catch (error) {
      if (
        error instanceof OpenAI.RateLimitError ||
        error instanceof OpenAI.InternalServerError
      ) {
        throw new RetryError(error.message)
      }

      throw error
    }
  }

  /**
   * Get cost of completion.
   *
   * @param usage The completion usage to get cost for.
   * @returns The cost of the completion.
   */
  getCost(usage: OpenAI.Completions.CompletionUsage | undefined) {
    if (!usage) {
      return Number.NaN
    }

    // Find cost configuration (default to llama-v2-7b-chat if not found)
    const modelCost =
      FireworksProvider.COST_PER_TOKEN[this.model] ||
      FireworksProvider.COST_PER_TOKEN[
        'accounts/fireworks/models/llama-v2-7b-chat'
      ]

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }
}
