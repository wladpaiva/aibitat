import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'zhipu',
  model: 'glm-4',
})
  .function({
    name: 'test-zhipu',
    description: 'Test function for Zhipu AI provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Zhipu AI is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-zhipu'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Zhipu AI 是否正常工作。',
  })
}
