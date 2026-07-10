import { createContext, useContext } from 'react'

export const DataManagerContext = createContext<() => void>(() => undefined)

export function useDataManager(): () => void {
  return useContext(DataManagerContext)
}
