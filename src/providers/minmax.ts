import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for MinMax API.
 */
type MinMaxModel = 'minmax-7b' | 'minmax-13b' | 'minmax-34b'

/**
 * The configuration for MinMax provider.
 */
export type MinMaxProviderConfig = {
  /**
   * The options for MinMax client (compatible with OpenAI).
   * @default {apiKey: process.env.MINMAX_API_KEY, baseURL: "https://api.minmax.ai/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for MinMax.
   * @default 'minmax-7b'
   */
  model?: MinMaxModel
}

/**
 * The provider for MinMax API.
 * Uses OpenAI-compatible API.
 */
export class MinMaxProvider extends Provider<OpenAI> {
  private model: MinMaxModel

  // Cost estimation (approximate, may need adjustment)
  static COST_PER_TOKEN = {
    'minmax-7b': {
      input: 0.00001,
      output: 0.00001,
    },
    'minmax-13b': {
      input: 0.00002,
      output: 0.00002,
    },
    'minmax-34b': {
      input: 0.00004,
      output: 0.00004,
    },
  }

  constructor(config: MinMaxProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.MINMAX_API_KEY,
        baseURL: 'https://api.minmax.ai/v1',
        maxRetries: 3,
      },
      model = 'minmax-7b',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to MinMax.
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

    // Find cost configuration (default to minmax-7b if not found)
    const modelCost =
      MinMaxProvider.COST_PER_TOKEN[this.model] ||
      MinMaxProvider.COST_PER_TOKEN['minmax-7b']

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }
}
