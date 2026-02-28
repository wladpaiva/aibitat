import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'moonshot',
  model: 'moonshot-v1-8k',
})
  .function({
    name: 'test-moonshot',
    description: 'Test function for Moonshot (Kimi) provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Moonshot (Kimi) is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-moonshot'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Moonshot (Kimi) 是否正常工作。',
  })
}
