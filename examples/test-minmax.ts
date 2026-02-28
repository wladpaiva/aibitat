import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'minmax',
  model: 'minmax-7b',
})
  .function({
    name: 'test-minmax',
    description: 'Test function for MinMax provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'MinMax is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-minmax'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content: '请使用你的 function 调用测试一下，并告诉我 MinMax 是否正常工作。',
  })
}
