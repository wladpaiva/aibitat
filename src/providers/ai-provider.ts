import {FunctionDefinition} from '../index.ts'

export type Role = 'system' | 'user' | 'assistant'

export type Message = {
  /**
   * The contents of the message.
   */
  content: string

  /**
   * The role of the messages author. One of `system`, `user` or `assistant`
   */
  role: Role
}

/**
 * A service that provides an AI client to create a completion.
 */
export abstract class AIProvider<T> {
  private _client: T

  constructor(client: T) {
    this._client = client
  }

  /**
   * Get the client.
   * @returns The client.
   */
  get client() {
    return this._client
  }

  /**
   * (Abstract async method) Create a completion based on the received messages.
   *
   * @throws It should thrown known treated errors from `src/error.ts`.
   * @param messages A list of messages to send.
   */
  abstract create(
    messages: Message[],
    functions?: FunctionDefinition[],
  ): Promise<string>
}
