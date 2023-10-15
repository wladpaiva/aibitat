import chalk from 'chalk'

export async function printOnTerminal(
  message: {from: string; to: string; content?: string} & {
    state: 'loading' | 'error' | 'success' | 'interrupt'
  },
) {
  const replying = chalk.dim(`(to ${message.to})`)
  process.stdout.write(`${chalk.bold(message.from)} ${replying}: `)

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

  process.stdout.write('\n')
}

export function terminate() {
  setTimeout(() => {
    console.log()
    console.timeEnd('🚀 chat finished')
    process.stdin.pause()
  }, 100)
}
