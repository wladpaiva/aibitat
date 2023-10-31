import OpenAI, {ClientOptions} from 'openai'

import {RetryError} from '../error.ts'
import AIbitat from '../index.ts'
import {Provider} from './ai-provider.ts'

/**
 * The model to use for the OpenAI API.
 */
type OpenAIModel = OpenAI.Chat.Completions.ChatCompletionCreateParams['model']

/**
 * The configuration for the OpenAI provider.
 */
export type OpenAIProviderConfig = {
  /**
   * The options for the OpenAI client.
   * @default {apiKey: process.env.OPENAI_API_KEY}
   */
  options?: ClientOptions
  /**
   * The model to use for the OpenAI API.
   * @default 'gpt-3.5-turbo'
   */
  model?: OpenAIModel
}

/**
 * The provider for the OpenAI API.
 * By default, the model is set to 'gpt-3.5-turbo'.
 */
export class OpenAIProvider extends Provider<OpenAI> {
  private model: OpenAIModel
  static COST_PER_TOKEN = {
    'gpt-4': {
      input: 0.03,
      output: 0.06,
    },
    'gpt-4-32k': {
      input: 0.06,
      output: 0.12,
    },
    'gpt-3.5-turbo': {
      input: 0.0015,
      output: 0.002,
    },
    'gpt-3.5-turbo-16k': {
      input: 0.003,
      output: 0.004,
    },
  }

  constructor(config: OpenAIProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 3,
      },
      model = 'gpt-3.5-turbo',
    } = config

    const client = new OpenAI(options)

    super(client)

    this.model = model
  }

  /**
   * Create a completion based on the received messages.
   *
   * @param messages A list of messages to send to the OpenAI API.
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

      // Right now, we only support one completion
      // so we just take the first one in the list
      const completion = response.choices[0].message
      const cost = this.getCost(response.usage)
      // treat function calls
      if (completion.function_call) {
        let functionArgs: object
        try {
          functionArgs = JSON.parse(completion.function_call.arguments)
        } catch (error) {
          // call the complete function again in case it gets a json error
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
        error instanceof OpenAI.InternalServerError ||
        error instanceof OpenAI.APIError
      ) {
        throw new RetryError(error.message)
      }

      throw error
    }
  }

  /**
   * Get the cost of the completion.
   *
   * @param completion The completion to get the cost for.
   * @returns The cost of the completion.
   */
  getCost(usage: OpenAI.Completions.CompletionUsage | undefined) {
    if (!usage) {
      return Number.NaN
    }

    // regex to remove the version number from the model
    const modelBase = this.model.replace(/-(\d{4})$/, '')

    if (!(modelBase in OpenAIProvider.COST_PER_TOKEN)) {
      return Number.NaN
    }

    const costPerToken =
      OpenAIProvider.COST_PER_TOKEN[
        modelBase as keyof typeof OpenAIProvider.COST_PER_TOKEN
      ]

    const inputCost = (usage.prompt_tokens / 1000) * costPerToken.input
    const outputCost = (usage.completion_tokens / 1000) * costPerToken.output

    return inputCost + outputCost
  }
}
