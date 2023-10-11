import {Message} from './types'

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
   * @param messages A list of messages to send.
   */
  abstract create(messages: Message[]): Promise<string>
}
