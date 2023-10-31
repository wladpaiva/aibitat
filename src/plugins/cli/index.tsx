import {render} from 'ink'

import type {AIbitatPlugin, Chat} from '../..'
import {App} from './app'

/**
 * Command-line Interface plugin. It prints the messages on the console and asks for feedback
 * while the conversation is running in the background.
 */
function cli() {
  return {
    name: 'cli',
    setup(aibitat) {
      let startTime: number | undefined
      let finishTime: number | undefined
      let history: Chat[] = []
      const app = render(<App aibitat={aibitat} history={history} />)

      const refresh = () => {
        app.rerender(
          <App
            aibitat={aibitat}
            history={aibitat.chats}
            startTime={startTime}
            finishTime={finishTime}
          />,
        )
      }

      aibitat.onStart(() => {
        startTime = performance.now()
        refresh()
      })
      aibitat.onTerminate(() => {
        finishTime = performance.now()
        refresh()
      })
      aibitat.onThinking(refresh)
      aibitat.onInterrupt(refresh)
      aibitat.onMessage(refresh)
    },
  } as AIbitatPlugin<any>
}

export {cli}
