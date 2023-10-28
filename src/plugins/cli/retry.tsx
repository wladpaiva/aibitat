import {Text} from 'ink'
import prettyMilliseconds from 'pretty-ms'
import {useEffect, useState} from 'react'

import {RateLimitError, ServerError} from '../../error'
import {useAIbitat} from './context'

export function Retry() {
  const aibitat = useAIbitat()
  const [retryCounter, setRetryCounter] = useState(60)

  useEffect(() => {
    let retryTimer: NodeJS.Timeout | undefined

    aibitat.onError(error => {
      // Only retry on rate limit and server errors
      if (!(error instanceof RateLimitError || error instanceof ServerError)) {
        return
      }

      retryTimer = setInterval(() => {
        setRetryCounter(previousCounter => {
          const newRetry = previousCounter - 1

          if (newRetry === 0) {
            clearInterval(retryTimer)
            aibitat.retry()
            return 60
          }

          return newRetry
        })
      }, 1_000)
    })

    return () => {
      clearInterval(retryTimer)
    }
  }, [aibitat])

  return retryCounter < 60 ? (
    <Text color="red">
      Retrying in {prettyMilliseconds(retryCounter * 1_000)}
    </Text>
  ) : null
}
