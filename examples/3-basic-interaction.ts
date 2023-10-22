import {AIbitat} from '../src'
import {cli} from '../src/plugins'

const aibitat = new AIbitat()
  .use(cli())
  .agent('client', {
    interrupt: 'ALWAYS',
  })
  .agent('mathematician', {
    role: `You are a mathematician and only solve math problems from client`,
  })
  .agent('reviewer', {
    role: `You are a peer-reviewer and you do not solve math problems. Check the result from mathematician and then confirm. Just confirm, no talk.`,
  })
  .channel('management', ['mathematician', 'reviewer', 'client'])

if (import.meta.main) {
  await aibitat.start({
    from: 'client',
    to: 'management',
    content: '2 + 2 = ?',
  })
}
