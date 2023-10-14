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
      interrupt: 'NEVER',
      role: 'You decide if the group needs to stop. If reviewer confirm the results, reply "TERMINATE" in the end. Otherwise reply "INTERRUPT".',
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

await flow.start({
  from: 'client',
  to: 'manager',
  content: '2 + 2 = ?',
})

process.stdin.resume()
