import {Box, render, Text} from 'ink'
import Spinner from 'ink-spinner'
import prettyMilliseconds from 'pretty-ms'
import React, {useEffect, useState} from 'react'

import {AIbitat, Chat} from '../..'
import {AIbitatProvider} from './context'
import {Retry} from './retry'

function Message(chat: Chat) {
  return (
    <Box flexDirection="column">
      <Box>
        <Box>
          <Text bold>{chat.from} </Text>
          <Text dimColor>
            (to {chat.to}
            {chat.state === 'replied' && (
              <Text dimColor> in {prettyMilliseconds(chat.time)}</Text>
            )}
            )
          </Text>

          <Text>:</Text>
        </Box>
      </Box>

      <Box>
        <Box borderStyle="single" borderLeft={false} borderRight={false}>
          {chat.state === 'replied' ? (
            <Text>{chat.content}</Text>
          ) : chat.state === 'seeded' ? (
            <Text color="yellowBright">{chat.content}</Text>
          ) : chat.state === 'failed' ? (
            <Box flexDirection="column">
              <Box gap={1}>
                <Text color="red">✗</Text>
                <Text dimColor>Something went wrong...</Text>
              </Box>
              <Text dimColor>{chat.content}</Text>
            </Box>
          ) : chat.state === 'interrupted' ? null : (
            <Box gap={1}>
              <Text color="green">
                <Spinner type="dots" />
              </Text>
              <Text dimColor>Thinking...</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export function App({
  aibitat,
  startTime,
  finishTime,
  history,
}: {
  aibitat: AIbitat<any>
  startTime?: number
  finishTime?: number
  history?: Chat[]
}) {
  return (
    <AIbitatProvider aibitat={aibitat}>
      <Box flexDirection="column" paddingY={1}>
        {startTime && (
          <Box marginBottom={1}>
            <Box borderStyle="round" paddingLeft={2}>
              <Text>AIbitat 🗯️🗯️💬</Text>
            </Box>
          </Box>
        )}

        <Box flexDirection="column" gap={2}>
          {history?.map((message, index) => (
            <Message key={index} {...message} />
          ))}
        </Box>

        <Retry />

        {finishTime && startTime && (
          <Box marginTop={2} gap={1}>
            <Text color="green">✔︎</Text>
            <Text>Chat finished in</Text>
            <Text color="green">
              {prettyMilliseconds(finishTime - startTime)}
            </Text>
          </Box>
        )}
      </Box>
    </AIbitatProvider>
  )
}
