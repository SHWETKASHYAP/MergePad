import { useEffect, useRef, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { getColorFromUsername } from '../utils/colorUtils'

export function useCollaboration({ username, roomId, isHost }) {
  const providerRef = useRef(null)
  const [users, setUsers] = useState([])

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc])

  useEffect(() => {
    if (!username || !roomId) return

    const provider = new SocketIOProvider(
      import.meta.env.VITE_API_URL || 'http://localhost:3000',
      roomId,
      ydoc,
      { autoConnect: true }
    )

    providerRef.current = provider

    provider.awareness.setLocalStateField('user', {
      username,
      color: getColorFromUsername(username),
      clientId: ydoc.clientID,
      isHost,
    })

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const uniqueUsers = Array.from(
        new Map(
          states
            .filter(([, state]) => state.user?.username)
            .map(([clientId, state]) => [
              state.user.username,
              {
                ...state.user,
                clientId,
                // include cursor data if available
                cursor: state.cursor || null,
              },
            ])
        ).values()
      )
      setUsers(uniqueUsers)
    }

    updateUsers()
    provider.awareness.on('change', updateUsers)

    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField('user', null)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      provider.destroy()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [username, roomId, ydoc, isHost])


  // broadcast this user's cursor position whenever it changes via awareness
  const updateCursor = (position, selection) => {
    if (!providerRef.current) return
    providerRef.current.awareness.setLocalStateField('cursor', {
      position,    // { lineNumber, column }
      selection,   // { startLineNumber, startColumn, endLineNumber, endColumn }
    })
  }

  //expose socket so components can listen to events like 'code-output'
  const getSocket = () => providerRef.current?.awareness?.provider?.socket || null

  return { providerRef, users, ydoc, yText, updateCursor, getSocket }
}
