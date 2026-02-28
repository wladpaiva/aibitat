import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Hugging Face API.
 */
type HuggingFaceModel =
  | 'meta-llama/Meta-Llama-3-8B-Instruct'
  | 'meta-llama/Meta-Llama-3-70B-Instruct'
  | 'mistralai/Mistral-7B-Instruct-v0.2'
  | 'mistralai/Mixtral-8x7B-Instruct-v0.1'
  | 'google/gemma-7b-it'

/**
 * The configuration for Hugging Face provider.
 */
export type HuggingFaceProviderConfig = {
  /**
   * The options for Hugging Face client (compatible with OpenAI).
   * @default {apiKey: process.env.HUGGINGFACE_API_KEY, baseURL: "https://api-inference.huggingface.co/v1"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Hugging Face.
   * @default 'meta-llama/Meta-Llama-3-8B-Instruct'
   */
  model?: HuggingFaceModel
}

/**
 * The provider for Hugging Face API.
 * Uses OpenAI-compatible API.
 */
export class HuggingFaceProvider extends Provider<OpenAI> {
  private model: HuggingFaceModel

  // Cost estimation (approximate, may need adjustment)
  // Hugging Face Inference API uses a different pricing model
  static COST_PER_TOKEN = {
    'meta-llama/Meta-Llama-3-8B-Instruct': {
      input: 0.0000007,
      output: 0.0000007,
    },
    'meta-llama/Meta-Llama-3-70B-Instruct': {
      input: 0.000002,
      output: 0.000002,
    },
    'mistralai/Mistral-7B-Instruct-v0.2': {
      input: 0.0000002,
      output: 0.0000002,
    },
    'mistralai/Mixtral-8x7B-Instruct-v0.1': {
      input: 0.0000007,
      output: 0.0000007,
    },
    'google/gemma-7b-it': {
      input: 0.0000001,
      output: 0.0000001,
    },
  }

  constructor(config: HuggingFaceProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.HUGGINGFACE_API_KEY,
        baseURL: 'https://api-inference.huggingface.co/v1',
        maxRetries: 3,
      },
      model = 'meta-llama/Meta-Llama-3-8B-Instruct',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Hugging Face.
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

    // Find cost configuration (default to Meta-Llama-3-8B if not found)
    const modelCost =
      HuggingFaceProvider.COST_PER_TOKEN[this.model] ||
      HuggingFaceProvider.COST_PER_TOKEN['meta-llama/Meta-Llama-3-8B-Instruct']

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }
}
