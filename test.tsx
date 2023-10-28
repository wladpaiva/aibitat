import {input} from '@inquirer/prompts'
import {Box, render, Text} from 'ink'
import Spinner from 'ink-spinner'
import React, {useEffect, useState} from 'react'

import {Chat} from './src'

const Message = ({from, to, state, content}: Chat) => {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="single"
        borderTop={false}
        borderLeft={false}
        borderRight={false}
      >
        <Box gap={1}>
          <Text bold>{from}</Text>
          <Text dimColor>(to {to})</Text>
        </Box>
        <Text>:</Text>
      </Box>

      {state === 'loading' ? (
        <Box>
          <Text dimColor>
            <Text color="green">
              <Spinner type="dots" />
            </Text>
            {' Thinking...'}
          </Text>
        </Box>
      ) : (
        state === 'success' && <Text>{content}</Text>
      )}
    </Box>
  )
}

const Counter = () => {
  const [counter, setCounter] = useState(0)

  // useEffect(() => {
  // 	const timer = setInterval(() => {
  // 		setCounter(previousCounter => previousCounter + 1);
  // 	}, 100);

  // 	return () => {
  // 		clearInterval(timer);
  // 	};
  // }, []);

  return (
    <>
      {/* <Text>
			<Text color="green">
				<Spinner type="dots" />
			</Text>
			{' Loading'}
		</Text>
		<Text color="green">{counter} tests passed</Text> */}
      <Box flexDirection="column" gap={2}>
        <Message
          from="Wlad"
          to="#wilson"
          state="success"
          content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet."
        />
        <Message
          from="Wlad"
          to="#wilson"
          state="success"
          content="Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet."
        />
        <Message
          from="Wlad"
          to="#wilson"
          state="success"
          content={`Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet. Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.
				
Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium odio debitis nemo minus earum, soluta mollitia omnis? Cum nihil distinctio molestias dicta dolores neque, minima sit quisquam velit placeat eveniet.`}
        />
        <Message from="Wlad" to="#wilson" state="loading" />
      </Box>
    </>
  )
}

const a = render(<Counter />)
