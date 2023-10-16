import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const habitat = new AIbitat({
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

habitat.on('message', terminal.print)
habitat.on('terminate', terminal.terminate)

habitat.on('interrupt', async node => {
  const feedback = await terminal.askForFeedback(node)
  await habitat.continue(feedback)
})

await habitat.start({
  from: 'client',
  to: 'manager',
  content: '2 + 2 = ?',
})

terminal.keepOpen()
