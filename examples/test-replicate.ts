import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'replicate',
  model: 'meta/llama-2-70b-chat',
})
  .function({
    name: 'test-replicate',
    description: 'Test function for Replicate provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Replicate is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-replicate'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Replicate 是否正常工作。',
  })
}
