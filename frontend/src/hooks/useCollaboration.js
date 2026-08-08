import { useEffect, useRef, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { io } from 'socket.io-client'
import { getColorFromUsername } from '../utils/colorUtils'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useCollaboration({ username, roomId, isHost }) {
  const providerRef = useRef(null)
  const socketRef = useRef(null)
  const [users, setUsers] = useState([])

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc])

  useEffect(() => {
    if (!username || !roomId) return

    //--------Yjs provider ( handles doc sync and awareness )-------------

    const provider = new SocketIOProvider(
      BACKEND_URL,
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

    // Separate sockets for custom events like 'code-output' that are not handled by y-socket.io
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling']})
    socketRef.current = socket

    //join the room on this socket too so server can emit to it
    socket.on('connect', () => {
      socket.emit('join-room', roomId)
    })


    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField('user', null)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      provider.destroy()
      socket.disconnect()
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
  const getSocket = () => socketRef.current

  return { providerRef, users, ydoc, yText, updateCursor, getSocket }
}
