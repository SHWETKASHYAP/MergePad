import './App.css'
import { useState } from 'react'
import { RoomSelection } from '../components/RoomSelection'
import { Sidebar } from '../components/Sidebar'
import { EditorPanel } from '../components/EditorPanel'
import { useCollaboration } from '../hooks/useCollaboration'

function App() {
  const searchParams = new URLSearchParams(window.location.search)

  const [username, setUsername] = useState(
    () => searchParams.get('username') || ''
  )
  const [roomId, setRoomId] = useState(
    () => searchParams.get('roomId') || ''
  )
  const [isHost] = useState(searchParams.get('host') === 'true')

  const { providerRef, users, yText, updateCursor } = useCollaboration({
    username,
    roomId,
    isHost,
  })

  if (!username || !roomId) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <RoomSelection setUsername={setUsername} setRoomId={setRoomId} />
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <Sidebar users={users} roomId={roomId} />
      <EditorPanel
        yText={yText}
        providerRef={providerRef}
        users={users}
        updateCursor={updateCursor}
        currentUsername={username}
      />
    </main>
  )
}

export default App