import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'cohere',
  model: 'command-r',
})
  .function({
    name: 'test-cohere',
    description: 'Test function for Cohere provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Cohere is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-cohere'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content: '请使用你的 function 调用测试一下，并告诉我 Cohere 是否正常工作。',
  })
}
