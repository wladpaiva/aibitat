import type {AIbitat} from '..'

/**
 * A service that provides an AI client to create a completion.
 */
export abstract class Provider<T> {
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
   * @throws known treated errors from `src/error.ts`.
   * @param messages A list of messages to send.
   */
  abstract complete(
    messages: Provider.Message[],
    functions?: AIbitat.FunctionDefinition[],
  ): Promise<Provider.Completion>
}

export namespace Provider {
  /**
   * Types of messages the provider can exchange
   */
  export type Role = 'system' | 'user' | 'assistant' | 'function'

  /**
   * Message exchanged between the provider and the user
   */
  export type Message = {
    /**
     * The contents of the message.
     *
     * If the message is a function, the content is the function call's
     * response.
     */
    content: string | null

    /**
     * The role of the messages author. One of `system`, `user`, `assistant` or
     * `function`.
     */
    role: Role

    /**
     * The name of the author of this message. `name` is required if role is
     * `function`, and it should be the name of the function whose response is in the
     * `content`. May contain a-z, A-Z, 0-9, and underscores, with a maximum length of
     * 64 characters.
     */
    name?: string
  }

  /**
   * Completion returned by the provider
   */
  export type Completion = {
    /**
     * Whatever the provider returns as a completion.
     *
     * If the completion is a function, the result is null.
     */
    result: string | null

    /**
     * The cost to run this completion in USD
     */
    cost: number

    /**
     * The function to be called in case the provider wants to call some external function
     */
    functionCall?: AIbitat.FunctionCall
  }
}
