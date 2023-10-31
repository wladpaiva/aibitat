import React, {createContext, useContext} from 'react'

import type {AIbitat} from '../..'

const AIbitatContext = createContext<AIbitat<any> | undefined>(undefined)

function useAIbitat() {
  const context = useContext(AIbitatContext)
  if (context === undefined) {
    throw new Error('useAIbitat must be used within a AIbitatProvider')
  }
  return context
}

function AIbitatProvider({
  children,
  aibitat,
}: {
  children: React.ReactNode
  aibitat: AIbitat<any>
}) {
  return (
    <AIbitatContext.Provider value={aibitat}>
      {children}
    </AIbitatContext.Provider>
  )
}

export {AIbitatProvider, useAIbitat}
