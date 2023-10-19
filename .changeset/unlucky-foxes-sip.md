---
'aibitat': patch
---

### 🎉 Function calling is here!!!

You can now call functions from the conversation. This is a huge step forward in
making Aibitat more powerful and flexible.

To have your agents calling functions, use the `function` method to register a
function:

```ts
const aibitat = new AIbitat().function({
  name: 'unique-function-name',
  description: 'List of releases of AIbitat and the notes for each release.',
  parameters: {
    type: 'object',
    properties: {},
  },
  handler: async () => {
    const response = await fetch(
      'https://github.com/wladiston/aibitat/releases',
    )
    const html = await response.text()
    const text = cheerio.load(html).text()
    return text
  },
})
```
