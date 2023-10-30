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
import {AIProvider, Message} from './ai-provider.ts'

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

    // clone messages to avoid mutating the original array
    const promptMessages = [...messages]

    if (functions) {
      const functionPrompt = `<functions>You have been trained to directly call a Javascript function passing a JSON Schema parameter as a response to this chat. This function will return a string that you can use to keep chatting.
  
  Here is a list of functions available to you:
  ${JSON.stringify(
    functions.map(({handler, ...rest}) => rest),
    null,
    2,
  )}
  
  When calling any of those function in order to complete your task, respond only this JSON format. Do not include any other information or any other stuff.
  
  Function call format:
  {
     function_name: "givenfunctionname",
     parameters: {}
  }
  </functions>`
      // add function prompt after the first message
      promptMessages.splice(1, 0, {
        content: functionPrompt,
        role: 'system',
      })
    }

    const prompt = promptMessages
      .map(message => {
        const {content, role} = message

        switch (role) {
          case 'system':
            return content
              ? `${Anthropic.HUMAN_PROMPT} <admin>${content}</admin>`
              : ''

          case 'user':
            return `${Anthropic.HUMAN_PROMPT} ${content}`

          case 'assistant':
            return `${Anthropic.AI_PROMPT} ${content}`

          default:
            return content
        }
      })
      .filter(Boolean)
      .join('\n')
      .concat(` ${Anthropic.AI_PROMPT}`)

    try {
      const response = await this.client.completions.create({
        model: this.model,
        max_tokens_to_sample: 300,
        stream: false,
        prompt,
      })

      const result = response.completion.trim()

      // Handle function calls if the model returns a function call
      if (result.includes('function_name') && functions) {
        const functionResponse = await this.callFunction(result, functions)

        return await this.create(
          [
            ...messages,
            //  extend conversation with function response
            {
              role: 'user',
              content: functionResponse,
            },
          ],
          functions,
        )
      }

      return result
    } catch (error) {
      // if (error instanceof Anthropic.BadRequestError) {
      //   throw new Error(error.message)
      // }

      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        throw new AuthorizationError(error.message)
      }

      // if (error instanceof Anthropic.NotFoundError) {
      //   throw new Error(error.message)
      // }

      // if (error instanceof Anthropic.ConflictError) {
      //   throw new Error(error.message)
      // }

      // if (error instanceof Anthropic.UnprocessableEntityError) {
      //   throw new Error(error.message)
      // }

      if (error instanceof Anthropic.RateLimitError) {
        throw new RateLimitError(error.message)
      }

      if (error instanceof Anthropic.InternalServerError) {
        throw new ServerError(error.message)
      }

      if (error instanceof Anthropic.APIError) {
        throw new UnknownError(error.message)
      }

      throw error
    }
  }

  private callFunction(callJson: string, functions: FunctionDefinition[]) {
    let call: object
    try {
      call = JSON.parse(callJson)
    } catch (error) {
      return `${callJson}
Invalid JSON:  ${(error as Error).message}`
    }

    const {function_name, parameters} = call as {
      function_name: string
      parameters: object
    }

    const functionDefinition = functions.find(
      ({name}) => name === function_name,
    )

    if (!functionDefinition) {
      return `${callJson} gave me a function not found.`
    }

    return functionDefinition.handler(parameters)
  }
}
