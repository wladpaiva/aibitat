import fs from 'fs'
import path from 'path'

import {AIbitatPlugin} from '..'

export function fileHistory({
  filename = `history/chat-history-${new Date().toISOString()}.json`,
}: {
  /**
   * The location of the file to save the chat history
   * @default `history/chat-history-${new Date().toISOString()}.json`
   */
  filename?: string
} = {}) {
  return {
    name: 'file-history-plugin',
    setup(aibitat) {
      const folderPath = path.dirname(filename)
      // get path from filename
      if (folderPath) {
        fs.mkdirSync(folderPath, {recursive: true})
      }

      aibitat.onMessage(() => {
        const content = JSON.stringify(aibitat.chats, null, 2)
        if (typeof Bun !== 'undefined') {
          return Bun.write(filename, content)
        }

        fs.writeFile(filename, content, err => {
          if (err) {
            console.error(err)
          }
        })
      })
    },
  } as AIbitatPlugin
}
