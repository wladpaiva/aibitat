import {AIbitat} from '../src'
import {cli} from '../src/plugins'

const aibitat = new AIbitat({
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
}).use(cli())

await aibitat.start({
  from: 'client',
  to: 'manager',
  content: '2 + 2 = ?',
})
