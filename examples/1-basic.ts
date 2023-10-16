import {AIbitat} from '../src'
import {terminal} from '../src/utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const habitat = new AIbitat({
  nodes: {
    '🧑': '🤖',
  },
  config: {
    '🧑': {
      type: 'assistant',
      interrupt: 'NEVER',
      role: 'You are a human assistant. Reply "TERMINATE" in when there is a correct answer.',
    },
    '🤖': {type: 'agent'},
  },
})

habitat.on('message', terminal.print)
habitat.on('terminate', terminal.terminate)

await habitat.start({
  from: '🧑',
  to: '🤖',
  content: '2 + 2 = 4?',
})

terminal.keepOpen()
