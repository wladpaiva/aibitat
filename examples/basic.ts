import {ChatFlow} from '../src'
import {printOnTerminal} from './utils'

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

flow.on('terminate', () => {
  setTimeout(() => {
    console.log()
    console.timeEnd('🚀 chat finished')
    process.stdin.pause()
  }, 100)
})

await flow.start({
  from: '🧑',
  to: '🤖',
  content: '2 + 2 = 4?',
})

process.stdin.resume()
