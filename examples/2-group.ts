import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const aibitat = new AIbitat({
  model: 'gpt-4',
  nodes: {
    client: 'manager',
    manager: ['mathematician', 'reviewer', 'client'],
  },
  config: {
    client: {
      type: 'assistant',
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

aibitat.on('message', terminal.print)
aibitat.on('terminate', () => console.timeEnd('🚀 chat finished'))

await aibitat.start({
  from: 'client',
  to: 'manager',
  content: '2 + 2 = ?',
})
