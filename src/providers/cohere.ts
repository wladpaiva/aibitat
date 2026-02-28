import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Cohere API.
 */
type CohereModel =
  | 'command'
  | 'command-light'
  | 'command-nightly'
  | 'command-r'
  | 'command-r-plus'
  | 'command-r-light'

/**
 * The configuration for Cohere provider.
 */
export type CohereProviderConfig = {
  /**
   * The options for Cohere client (compatible with OpenAI).
   * @default {apiKey: process.env.COHERE_API_KEY, baseURL: "https://api.cohere.ai/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Cohere.
   * @default 'command-r'
   */
  model?: CohereModel
}

/**
 * The provider for Cohere API.
 * Uses OpenAI-compatible API.
 */
export class CohereProvider extends Provider<OpenAI> {
  private model: CohereModel

  // Cost estimation (approximate, may need adjustment)
  static COST_PER_TOKEN = {
    command: {
      input: 0.0003,
      output: 0.0006,
    },
    'command-light': {
      input: 0.00015,
      output: 0.0003,
    },
    'command-nightly': {
      input: 0.0003,
      output: 0.0006,
    },
    'command-r': {
      input: 0.00015,
      output: 0.0006,
    },
    'command-r-plus': {
      input: 0.0003,
      output: 0.0012,
    },
    'command-r-light': {
      input: 0.000075,
      output: 0.0003,
    },
  }

  constructor(config: CohereProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.COHERE_API_KEY,
        baseURL: 'https://api.cohere.ai/v1',
        maxRetries: 3,
      },
      model = 'command-r',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Cohere.
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

    // Find cost configuration (default to command-r if not found)
    const modelCost =
      CohereProvider.COST_PER_TOKEN[this.model] ||
      CohereProvider.COST_PER_TOKEN['command-r']

    const inputCost = (usage.prompt_tokens / 1000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000) * modelCost.output

    return inputCost + outputCost
  }
}
