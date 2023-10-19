import {input} from '@inquirer/prompts'
import chalk from 'chalk'

import {AIbitatPlugin} from '..'
import {RateLimitError, ServerError} from '../error'

/**
 * Command-line Interface plugin. It prints the messages on the console and asks for feedback
 * while the conversation is running in the background.
 */
function cli({
  simulateStream = true,
}: {
  /**
   * Simulate streaming by breaking the cached response into chunks.
   * Helpful to make the conversation more realistic and faster.
   * @default true
   */
  simulateStream?: boolean
} = {}) {
  return {
    name: 'cli',
    setup(aibitat) {
      let printing: Promise<void> | null = null

      aibitat.onError(error => {
        console.error(chalk.red(`   error: ${(error as Error).message}`))

        if (error instanceof RateLimitError || error instanceof ServerError) {
          console.error(chalk.red(`   retrying in 60 seconds...`))
          setTimeout(aibitat.retry, 60000)
          return
        }
      })

      aibitat.onStart(() => {
        console.log()
        console.log('🚀 starting chat ...\n')
        console.time('🚀 chat finished!')
        printing = Promise.resolve()
      })

      aibitat.onMessage(async message => {
        await printing
        printing = cli.print(message, simulateStream)
      })

      aibitat.onTerminate(() => console.timeEnd('🚀 chat finished'))

      aibitat.onInterrupt(async node => {
        await printing
        const feedback = await cli.askForFeedback(node)
        // Add an extra line after the message
        console.log()

        if (feedback === 'exit') {
          console.timeEnd('🚀 chat finished')
          return process.exit(0)
        }

        await aibitat.continue(feedback)
      })
    },
  } as AIbitatPlugin
}

/**
 * Print a message on the terminal
 *
 * @param message
 * @param simulateStream
 */
cli.print = async (
  message: {from: string; to: string; content?: string} & {
    state: 'loading' | 'error' | 'success' | 'interrupt'
  },
  simulateStream: boolean = true,
) => {
  const replying = chalk.dim(`(to ${message.to})`)
  const reference = `${chalk.magenta('✎')} ${chalk.bold(
    message.from,
  )} ${replying}:`

  if (!simulateStream) {
    console.log(reference)
    console.log(message.content)
    // Add an extra line after the message
    console.log()
    return
  }

  process.stdout.write(`${reference}\n`)

  // Emulate streaming by breaking the cached response into chunks
  const chunks = message.content?.split(' ') || []
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        const bytes = new TextEncoder().encode(chunk + ' ')
        controller.enqueue(bytes)
        await new Promise(r =>
          setTimeout(
            r,
            // get a random number between 10ms and 50ms to simulate a random delay
            Math.floor(Math.random() * 40) + 10,
          ),
        )
      }
      controller.close()
    },
  })

  // Stream the response to the chat
  for await (const chunk of stream) {
    process.stdout.write(new TextDecoder().decode(chunk))
  }

  // Add an extra line after the message
  console.log()
  console.log()
}

/**
 * Ask for feedback to the user using the terminal
 *
 * @param node
 * @returns
 */
cli.askForFeedback = (node: {from: string; to: string}) => {
  return input({
    message: `Provide feedback to ${chalk.yellow(node.to)} as ${chalk.yellow(
      node.from,
    )}. Press enter to skip and use auto-reply, or type 'exit' to end the conversation: `,
  })
}

export {cli}
