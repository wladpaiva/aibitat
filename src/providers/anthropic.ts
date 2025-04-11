import Anthropic from "@anthropic-ai/sdk";
import { AIProvider } from "aibitat";


/**
 * The model to use for the Anthropic API using the Messages API.
 */
type Message = {
  role: string;
  content: string;
};

/**
 * Updated Anthropic provider that uses the Messages API instead of the Completions API
 * for compatibility with the newer Claude models like Claude 3.5
 */
export class AnthropicMessagesProvider extends AIProvider<Anthropic> {
  private model: string;

  constructor(options: { apiKey?: string; model?: string }) {
    const client = new Anthropic({
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY || "",
    });
    super(client);
    this.model = options.model || "claude-3-5-sonnet-20241022";
  }

  async create(messages: Message[]): Promise<string> {
    // Convert messages to the format expected by Anthropic's Messages API
    const formattedMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => {
        return {
          role:
            message.role === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: message.content,
        };
      });

    // Handle system message - extract it from messages array
    const systemMessage = messages.find((message) => message.role === "system");
    const systemPrompt = systemMessage ? systemMessage.content : undefined;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: 4096,
      });

      // Extract text content from the response
      if (response.content[0] && "text" in response.content[0]) {
        return response.content[0].text;
      }

      return "No text response received from the API";
    } catch (error) {
      console.error("Error calling Anthropic API:", error);
      throw error;
    }
  }
}