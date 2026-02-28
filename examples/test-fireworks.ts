import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'fireworks',
  model: 'accounts/fireworks/models/llama-v2-7b-chat',
})
  .function({
    name: 'test-fireworks',
    description: 'Test function for Fireworks.ai provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Fireworks.ai is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-fireworks'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Fireworks.ai 是否正常工作。',
  })
}
