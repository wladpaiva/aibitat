import {Message} from '../types.ts'

/**
 * (In preview) An abstract class for AI agent.
 *
 * An agent can communicate with other agents and perform actions.
 * Different agents can differ in what actions they perform in the `receive` method.
 */
export abstract class Agent {
  private _name: string

  /**
   * @param name name of the agent.
   */
  constructor(name: string) {
    this._name = name
  }

  /**
   * Get the name of the agent.
   * @returns The name of the agent.
   */
  get name(): string {
    return this._name
  }

  /**
   * (Abstract method) Send a message to another agent.
   * @abstract
   * @param message The message to send.
   * @param recipient The recipient agent.
   * @param requestReply Whether a reply is requested.
   */
  abstract send(
    message: string | Message,
    recipient: Agent,
    requestReply?: boolean,
  ): Promise<void>

  /**
   * (Abstract async method) Receive a message from another agent.
   * @abstract
   * @param message The message received.
   * @param sender The sender agent.
   * @param requestReply Whether a reply is requested.
   */
  abstract receive(
    message: string | Message,
    sender: Agent,
    requestReply?: boolean,
    silent?: boolean,
  ): Promise<void>

  /**
   * (Abstract async method) Generate a reply based on the received messages.
   * @abstract
   * @param messages A list of messages received.
   * @param sender The sender agent.
   * @returns The generated reply. If None, no reply is generated.
   */
  abstract generateReply(
    messages?: Message[],
    sender?: Agent,
  ): Promise<string | null>

  /**
   * (Abstract method) Reset the agent.
   * @abstract
   */
  abstract reset(): void
}
