#!/usr/bin/env bun
import {input} from '@inquirer/prompts'
import chalk from 'chalk'

import {AIbitat} from './index.ts'
import {cli, experimental_webBrowsing} from './plugins'

console.log(chalk.greenBright('Welcome to AIbitat!'))

// Ask for the task of the chat before starting the conversation
const task = await input({
  message: 'What task should the AIbitat team accomplish?',
  validate: (value: string) => value.length > 0 || 'Please enter the task',
  default: `Create a brand based on client's brief`,
})

const aibitat = new AIbitat()
  .use(cli())
  .use(experimental_webBrowsing())
  .agent('prompter', {
    interrupt: 'ALWAYS',
    role: `You are a human assistant. Your job is to answer relevant question about the work that @pm can't answer. 
    Reply "TERMINATE" when @pm and @developer are done.`,
  })
  .agent('pm', {
    role: `You are a Project Manager. Your job is to take a deep breath and think about the task "${task}". 
    Name all the professionals and their roles involved to accomplish it including the objectives and tasks of 
    each role as well as how they communicate with each other.`,
  })
  .agent('developer', {
    model: 'gpt-4',
    functions: ['web-browsing', 'write-code'],
    role: `You are a Typescript developer. Your job is to look up online how to implement AI agents using the AIbitat framework 
    and then translate the professionals and roles that @pm has given to be AI agents. Use top-level await and don't 
    mention AIbitat in the professionals' roles. Specify their job title in the beginning of their role.`,
  })
  .channel('self-replicating', ['pm', 'developer', 'prompter'])
  .function({
    name: 'write-code',
    description: 'Write code',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: `The name of the file. Preferably what the team does and the date. In the format: "create-something-original".
             Including the file extension.`,
        },
        code: {type: 'string', description: 'The code to write'},
      },
    },
    async handler({filename, code}) {
      if (!filename) {
        return `Please provide a filename`
      }

      if (!code) {
        return `Please provide a code`
      }

      if (typeof Bun !== 'undefined') {
        Bun.write(filename, code)
        return `File ${filename} created and can be executed with "bun ${filename}"`
      }

      const fs = await import('fs')
      await fs.writeFile(filename, code, () => {})
      return `File ${filename} created and can be executed with "node ${filename}"`
    },
  })

await aibitat.start({
  from: 'prompter',
  to: 'self-replicating',
  content: `I need a code written using the framework AIbitat (documentation: 
      https://raw.githubusercontent.com/wladiston/aibitat/main/README.md) that can "${task}".`,
})
