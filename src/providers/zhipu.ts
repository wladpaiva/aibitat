import OpenAI from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for Zhipu AI API.
 */
type ZhipuModel =
  | 'glm-4'
  | 'glm-3-turbo'
  | 'glm-4-plus'
  | 'glm-4-0520'
  | 'glm-4-0524'
  | 'glm-4-0107'
  | 'glm-4-0626'

/**
 * The configuration for Zhipu AI provider.
 */
export type ZhipuProviderConfig = {
  /**
   * The options for Zhipu AI client (compatible with OpenAI).
   * @default {apiKey: process.env.ZHIPU_API_KEY, baseURL: "https://open.bigmodel.cn/api/paas/v4"}
   */
  options?: {
    apiKey?: string
    baseURL?: string
    maxRetries?: number
  }

  /**
   * The model to use for Zhipu AI.
   * @default 'glm-4'
   */
  model?: ZhipuModel
}

/**
 * The provider for Zhipu AI (智谱 AI).
 * Uses OpenAI-compatible API.
 */
export class ZhipuProvider extends Provider<OpenAI> {
  private model: ZhipuModel

  // Cost estimation (approximate, may need adjustment)
  static COST_PER_TOKEN = {
    'glm-4': {
      input: 0.03,
      output: 0.06,
    },
    'glm-3-turbo': {
      input: 0.005,
      output: 0.005,
    },
    'glm-4-plus': {
      input: 0.04,
      output: 0.08,
    },
    'glm-4-0520': {
      input: 0.03,
      output: 0.06,
    },
    'glm-4-0524': {
      input: 0.03,
      output: 0.06,
    },
    'glm-4-0107': {
      input: 0.03,
      output: 0.06,
    },
    'glm-4-0626': {
      input: 0.03,
      output: 0.06,
    },
  }

  constructor(config: ZhipuProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.ZHIPU_API_KEY,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        maxRetries: 3,
      },
      model = 'glm-4',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on received messages.
   *
   * @param messages A list of messages to send to Zhipu AI.
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
        // stream: true,
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

    // Find cost configuration (default to glm-4 if not found)
    const modelCost =
      ZhipuProvider.COST_PER_TOKEN[this.model] ||
      ZhipuProvider.COST_PER_TOKEN['glm-4']

    const inputCost = (usage.prompt_tokens / 1000) * modelCost.input
    const outputCost = (usage.completion_tokens / 1000) * modelCost.output

    return inputCost + outputCost
  }
}
