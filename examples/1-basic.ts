import {ChatFlow} from '../src'
import {printOnTerminal, terminate} from './utils'

console.log('🚀 starting chat\n')
console.time('🚀 chat finished')

const flow = new ChatFlow({
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

flow.on('message', printOnTerminal)
flow.on('terminate', terminate)

await flow.start({
  from: '🧑',
  to: '🤖',
  content: '2 + 2 = 4?',
})

process.stdin.resume()
