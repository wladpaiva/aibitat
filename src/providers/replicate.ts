import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Replicate API.
 */
type ReplicateModel =
  | 'meta/llama-2-70b-chat'
  | 'meta/llama-3-70b-instruct'
  | 'mistralai/mistral-7b-instruct-v0.1'
  | 'stabilityai/stable-diffusion-3'

/**
 * The configuration for Replicate provider.
 */
export type ReplicateProviderConfig = {
  /**
   * The options for Replicate client (compatible with OpenAI).
   * @default {apiKey: process.env.REPLICATE_API_TOKEN, baseURL: "https://api.replicate.com/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Replicate.
   * @default 'meta/llama-2-70b-chat'
   */
  model?: ReplicateModel
}

/**
 * The provider for Replicate API.
 * Uses OpenAI-compatible API.
 */
export class ReplicateProvider extends Provider<OpenAI> {
  private model: ReplicateModel

  // Cost estimation (approximate, may need adjustment)
  static COST_PER_TOKEN = {
    'meta/llama-2-70b-chat': {
      input: 0.000002,
      output: 0.000002,
    },
    'meta/llama-3-70b-instruct': {
      input: 0.0000035,
      output: 0.0000035,
    },
    'mistralai/mistral-7b-instruct-v0.1': {
      input: 0.0000002,
      output: 0.0000002,
    },
    'stabilityai/stable-diffusion-3': {
      input: 0.000015,
      output: 0.000015,
    },
  }

  constructor(config: ReplicateProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.REPLICATE_API_TOKEN,
        baseURL: 'https://api.replicate.com/v1',
        maxRetries: 3,
      },
      model = 'meta/llama-2-70b-chat',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Replicate.
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

    // Find cost configuration (default to llama-2-70b-chat if not found)
    const modelCost =
      ReplicateProvider.COST_PER_TOKEN[this.model] ||
      ReplicateProvider.COST_PER_TOKEN['meta/llama-2-70b-chat']

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }
}
