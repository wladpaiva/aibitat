import {AIbitat} from 'aibitat'
import {cli} from 'aibitat/plugins'

const aibitat = new AIbitat({
  nodes: {
    '🧑': '🤖',
    '🤖': ['🐭', '🦁', '🐶'],
  },
  config: {
    '🧑': {
      type: 'assistant',
      interrupt: 'NEVER',
      role: 'You are a human assistant. Reply "TERMINATE" in when there is a correct answer.',
    },
    '🤖': {type: 'manager'},
    '🐭': {type: 'agent', role: 'You do the math.'},
    '🦁': {type: 'agent', role: 'You check to see if its correct'},
    '🐶': {
      type: 'agent',
      role: 'You reply "TERMINATE" if theres`s a confirmation',
    },
  },
}).use(cli())

await aibitat.start({
  from: '🧑',
  to: '🤖',
  content: 'How much is 2 + 2?',
})
