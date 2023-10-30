import {Text, useApp, useInput} from 'ink'
import React, {useState} from 'react'

import {useAIbitat} from './context'

function Cursor() {
  const [visible, setVisible] = useState(true)

  // BUG: too much re-rendering makes it flicker when looking for something that has been replied
  // React.useEffect(() => {
  //   const id = setInterval(() => {
  //     setVisible(visible => !visible)
  //   }, 500)
  //   return () => clearInterval(id)
  // }, [])

  return visible ? (
    <Text color="white" backgroundColor="white">
      {/* ⎢ */}{' '}
    </Text>
  ) : (
    <Text> </Text>
  )
}

export function Input() {
  const aibitat = useAIbitat()
  const {exit} = useApp()
  const [text, setText] = React.useState('')

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      return exit()
    }

    if (key.escape) {
      return aibitat.continue()
    }

    /* FIX: [bun] ideally it should be shift+return but shift is not being detected on Bun */
    if (key.ctrl && input === 'n') {
      return setText(text => text.concat('\n'))
    }

    if (key.return) {
      if (text === 'exit') {
        return exit()
      }

      return aibitat.continue(text)
    }

    if (key.backspace || key.delete) {
      return setText(text => text.slice(0, -1))
    }

    setText(text => text + input)
  })

  return (
    <Text color="yellowBright">
      {text}
      <Cursor />
      {!text && (
        <Text dimColor color="gray">
          {/* FIX: [bun] ideally it should be shift+return but shift is not being detected on Bun */}
          (press 'esc' to skip and auto-reply, or 'ctrl+n' for new line, or type
          'exit' to end the conversation)
        </Text>
      )}
    </Text>
  )
}
