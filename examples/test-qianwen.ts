import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'qianwen',
  model: 'qwen-turbo',
})
  .function({
    name: 'test-qianwen',
    description: 'Test function for Qianwen provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Qianwen is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-qianwen'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Qianwen 是否正常工作。',
  })
}
