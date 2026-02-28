import {AIbitat} from '../src'

const aibitat = new AIbitat({
  provider: 'huggingface',
  model: 'meta-llama/Meta-Llama-3-8B-Instruct',
})
  .function({
    name: 'test-huggingface',
    description: 'Test function for Hugging Face provider',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return 'Hugging Face is working correctly! 🎉'
    },
  })
  .agent('🧑', {
    role: 'You are a human user asking questions.',
  })
  .agent('🤖', {
    role: 'You are a helpful AI assistant.',
    functions: ['test-huggingface'],
  })

if (import.meta.main) {
  await aibitat.start({
    from: '🧑',
    to: '🤖',
    content:
      '请使用你的 function 调用测试一下，并告诉我 Hugging Face 是否正常工作。',
  })
}
