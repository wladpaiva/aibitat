import {OpenAIStream, StreamingTextResponse} from 'ai'
import debug from 'debug'
import OpenAI, {ClientOptions} from 'openai'

import {Message} from '../types'
import {AIProvider} from './ai-provider'

const log = debug('autogen:provider')

/**
 * The model to use for the OpenAI API.
 */
type Model = OpenAI.Chat.Completions.ChatCompletionCreateParams['model']

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
  model?: Model
}

/**
 * The provider for the OpenAI API.
 * By default, the model is set to 'gpt-3.5-turbo'.
 */
export class OpenAIProvider extends AIProvider<OpenAI> {
  private model: Model

  constructor(config: OpenAIProviderConfig = {}) {
    const {
      options = {
        apiKey: process.env.OPENAI_API_KEY,
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
  async create(messages: Message[]) {
    log('calling `openai.chat.completions.create`')

    const response = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: messages!,
    })

    const stream = OpenAIStream(response)
    const result = new StreamingTextResponse(stream)
    return await result.text()
  }
}
