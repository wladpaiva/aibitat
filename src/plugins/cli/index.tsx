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
      const w = render(<App aibitat={aibitat} history={history} />)

      const refresh = () => {
        w.rerender(
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
        console.log('🔥🔥🔥')
        finishTime = performance.now()
        refresh()

        console.log('🔥🔥🔥')
      })
      aibitat.onThinking(refresh)
      aibitat.onMessage(refresh)
    },
  } as AIbitatPlugin<any>
}

export {cli}
