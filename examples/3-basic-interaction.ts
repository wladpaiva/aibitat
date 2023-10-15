import chalk from 'chalk'
import inquirer from 'inquirer'

import {ChatFlow} from '../src'
import {printOnTerminal, terminate} from './utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const flow = new ChatFlow({
  nodes: {
    client: 'manager',
    manager: ['mathematician', 'reviewer', 'client'],
  },
  config: {
    client: {
      type: 'assistant',
    },
    manager: {type: 'manager'},
    mathematician: {
      type: 'agent',
      role: `You are a mathematician and only solve math problems from client`,
    },
    reviewer: {
      type: 'agent',
      role: `You are a peer-reviewer and you do not solve math problems. Check the result from mathematician and then confirm. Just confirm, no talk.`,
    },
  },
})

flow.on('message', printOnTerminal)
flow.on('terminate', terminate)

flow.on('interrupt', async node => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'feedback',
      message: `Provide feedback to ${chalk.yellow(node.to)} as ${chalk.yellow(
        node.from,
      )}. Press enter to skip and use auto-reply, or type 'exit' to end the conversation: `,
    },
  ])

  if (answers.feedback === 'exit') {
    return process.exit(0)
  }

  await flow.continue(answers.feedback)
})

await flow.start({
  from: 'client',
  to: 'manager',
  content: '2 + 2 = ?',
})

process.stdin.resume()
