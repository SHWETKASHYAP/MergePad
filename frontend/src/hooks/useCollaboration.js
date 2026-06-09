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
      const states = Array.from(provider.awareness.getStates().values())
      const uniqueUsers = Array.from(
        new Map(
          states
            .map((state) => state.user)
            .filter((user) => user?.username)
            .map((user) => [user.username, user])
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

  return { providerRef, users, ydoc, yText }
}
