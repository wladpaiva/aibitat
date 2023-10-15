import chalk from 'chalk'
import inquirer from 'inquirer'

/**
 * Keep the terminal open by listening to stdin
 */
export function keepOpen() {
  process.stdin.resume()
}

/**
 * Print a message on the terminal
 */
export async function print(
  message: {from: string; to: string; content?: string} & {
    state: 'loading' | 'error' | 'success' | 'interrupt'
  },
) {
  const replying = chalk.dim(`(to ${message.to})`)
  const reference = `${chalk.magenta('✎')} ${chalk.bold(
    message.from,
  )} ${replying}:`

  console.log(reference)
  console.log(message.content)
  console.log()

  // process.stdout.write(reference)

  // // Emulate streaming by breaking the cached response into chunks
  // const chunks = message.content?.split(' ') || []
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     for (const chunk of chunks) {
  //       const bytes = new TextEncoder().encode(chunk + ' ')
  //       controller.enqueue(bytes)
  //       await new Promise(r =>
  //         setTimeout(
  //           r,
  //           // get a random number between 10ms and 50ms to simulate a random delay
  //           Math.floor(Math.random() * 40) + 10,
  //         ),
  //       )
  //     }
  //     controller.close()
  //   },
  // })

  // // Stream the response to the chat
  // for await (const chunk of stream) {
  //   process.stdout.write(new TextDecoder().decode(chunk))
  // }

  // process.stdout.write('\n')
}

/**
 * Terminate the chat by printing a new line and ending the process
 */
export function terminate() {
  setTimeout(() => {
    console.log()
    console.timeEnd('🚀 chat finished')
    process.stdin.pause()
  }, 100)
}

/**
 * Ask for feedback to the user using the terminal
 *
 * @param node
 * @returns
 */
export async function askForFeedback(node: {from: string; to: string}) {
  const {feedback} = await inquirer.prompt<{feedback: string | null}>([
    {
      type: 'input',
      name: 'feedback',
      message: `Provide feedback to ${chalk.yellow(node.to)} as ${chalk.yellow(
        node.from,
      )}. Press enter to skip and use auto-reply, or type 'exit' to end the conversation: `,
    },
  ])

  if (feedback === 'exit') {
    return process.exit(0)
  }

  return feedback
}
