import debug from 'debug'
import OpenAI, {
  ClientOptions,
  APIConnectionError as OpenAIAPIConnectionError,
  APIConnectionTimeoutError as OpenAIAPIConnectionTimeoutError,
  APIError as OpenAIAPIError,
  APIUserAbortError as OpenAIAPIUserAbortError,
  AuthenticationError as OpenAIAuthenticationError,
  BadRequestError as OpenAIBadRequestError,
  ConflictError as OpenAIConflictError,
  InternalServerError as OpenAIInternalServerError,
  NotFoundError as OpenAINotFoundError,
  PermissionDeniedError as OpenAIPermissionDeniedError,
  RateLimitError as OpenAIRateLimitError,
  UnprocessableEntityError as OpenAIUnprocessableEntityError,
} from 'openai'

import {FunctionDefinition} from '../aibitat.ts'
import {
  APIError,
  AuthorizationError,
  RateLimitError,
  ServerError,
  UnknownError,
} from '../error.ts'
import {Function, Message} from '../types.ts'
import {AIProvider} from './ai-provider.ts'

const log = debug('autogen:provider:openai')

/**
 * The model to use for the OpenAI API.
 */
export type OpenAIModel =
  OpenAI.Chat.Completions.ChatCompletionCreateParams['model']

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
export class OpenAIProvider extends AIProvider<OpenAI> {
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
  async create(
    messages: Message[],
    functions?: FunctionDefinition[],
  ): Promise<string> {
    log(`calling 'openai.chat.completions.create' with model '${this.model}'`)

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        // stream: true,
        messages,
        functions,
      })

      log('cost: ', this.getCost(response.usage))

      if (functions && response.choices[0].message.function_call) {
        // send the info on the function call and function response to GPT
        // and return the response

        const functionResponse = await this.callFunction(
          functions,
          response.choices[0].message.function_call,
        )

        return await this.create(
          [
            ...messages,
            response.choices[0].message, // extend conversation with assistant's reply
            //  extend conversation with function response
            {
              role: 'function',
              name: response.choices[0].message.function_call.name,
              content: functionResponse,
            },
          ],
          functions,
        )
      }

      if (response.choices[0].message.content) {
        return response.choices[0].message.content
      }

      throw new Error('No content found or function_call in the response')
      // const stream = OpenAIStream(response)
      // const result = new StreamingTextResponse(stream)
      // return await result.text()
    } catch (error) {
      // if (error instanceof OpenAIBadRequestError) {
      //   throw new Error(error.message)
      // }

      if (
        error instanceof OpenAIAuthenticationError ||
        error instanceof OpenAIPermissionDeniedError
      ) {
        throw new AuthorizationError(error.message)
      }

      // if (error instanceof OpenAINotFoundError) {
      //   throw new Error(error.message)
      // }

      // if (error instanceof OpenAIConflictError) {
      //   throw new Error(error.message)
      // }

      // if (error instanceof OpenAIUnprocessableEntityError) {
      //   throw new Error(error.message)
      // }

      if (error instanceof OpenAIRateLimitError) {
        throw new RateLimitError(error.message)
      }

      if (error instanceof OpenAIInternalServerError) {
        throw new ServerError(error.message)
      }

      if (error instanceof OpenAIAPIError) {
        throw new UnknownError(error.message)
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
      return 'unknown'
    }

    // regex to remove the version number from the string
    const model = this.model.replace(/-(\d{4})$/, '')

    if (!(model in OpenAIProvider.COST_PER_TOKEN)) {
      return 'unknown'
    }
    log('model:', model)

    const costPerToken =
      OpenAIProvider.COST_PER_TOKEN[
        model as keyof typeof OpenAIProvider.COST_PER_TOKEN
      ]

    const inputCost = (usage.prompt_tokens / 1000) * costPerToken.input
    const outputCost = (usage.completion_tokens / 1000) * costPerToken.output
    const total = inputCost + outputCost

    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(total)
  }

  /**
   * Call the function from the completion.
   *
   * @param functions The list of functions to call.
   * @param completion The completion to get the function from.
   * @returns The completion.
   */
  async callFunction(
    functions: FunctionDefinition[],
    call: OpenAI.Chat.ChatCompletionMessage.FunctionCall,
  ) {
    const funcToCall = functions.find(f => f.name === call.name)
    log(`calling function "${call.name}" with arguments: `, call.arguments)
    if (!funcToCall) {
      throw new Error(`Function '${call.name}' not found`)
    }

    let json: any

    try {
      json = JSON.parse(call.arguments)
    } catch (error) {
      throw new Error(
        `Model created an invalid JSON: '${call.arguments}' for function '${call.name}'`,
      )
    }

    return await funcToCall.handler(json)
  }
}
