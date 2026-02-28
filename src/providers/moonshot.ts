import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Moonshot (Kimi) API.
 */
type MoonshotModel = 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k'

/**
 * The configuration for Moonshot (Kimi) provider.
 */
export type MoonshotProviderConfig = {
  /**
   * The options for Moonshot client (compatible with OpenAI).
   * @default {apiKey: process.env.MOONSHOT_API_KEY, baseURL: "https://api.moonshot.cn/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Moonshot.
   * @default 'moonshot-v1-8k'
   */
  model?: MoonshotModel
}

/**
 * The provider for Moonshot (Kimi) API.
 * Uses OpenAI-compatible API.
 */
export class MoonshotProvider extends Provider<OpenAI> {
  private model: MoonshotModel

  // Cost estimation (approximate, may need adjustment)
  // Moonshot (Kimi) pricing may vary
  static COST_PER_TOKEN = {
    'moonshot-v1-8k': {
      input: 0.000012,
      output: 0.000012,
    },
    'moonshot-v1-32k': {
      input: 0.000024,
      output: 0.000024,
    },
    'moonshot-v1-128k': {
      input: 0.00006,
      output: 0.00006,
    },
  }

  constructor(config: MoonshotProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.MOONSHOT_API_KEY,
        baseURL: 'https://api.moonshot.cn/v1',
        maxRetries: 3,
      },
      model = 'moonshot-v1-8k',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Moonshot.
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

    // Find cost configuration (default to moonshot-v1-8k if not found)
    const modelCost =
      MoonshotProvider.COST_PER_TOKEN[this.model] ||
      MoonshotProvider.COST_PER_TOKEN['moonshot-v1-8k']

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }
}
