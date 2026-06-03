import './App.css'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'

console.log(import.meta.env)
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"


if (!BACKEND_URL) {
  throw new Error("VITE_API_URL is missing")
}


function getColorFromUsername(username) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = (Math.abs(hash) * 137) % 360
  return `hsl(${hue}, 70%, 60%)`
}

function RoomSelection({ setUsername, setRoomId}) {

  const createRoom = () => {

    const username = document.getElementById('username').value

    if(!username){
      alert("Please enter a username")
      return
    }

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

    setUsername(username)
    setRoomId(roomId)

    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}&host=true&hostUser=${username}`)

  }

  const joinRoom =() => {
    const username = document.getElementById('username').value
    const roomId = document.getElementById('roomId').value

    if(!username || !roomId){
      alert("Please enter both username and room ID")
      return
    }

    setUsername(username)
    setRoomId(roomId)
    
    window.history.pushState({}, '', `?username=${username}&roomId=${roomId}`)
  }

  return (
    <main className="h-screen flex items-center justify-center bg-gray-950">

      <div className="bg-gray-900 p-8 rounded-lg flex flex-col gap-4 w-96">

        <h1 className="text-3xl text-white text-center">
          MergePad
        </h1>

        <input
          id="username"
          placeholder="Username"
          className="p-2 rounded bg-gray-800 text-white"
        />

        <button
          onClick={createRoom}
          className="bg-green-600 p-2 rounded text-white"
        >
          Create Room
        </button>

        <input
          id="roomId"
          defaultValue={
            new URLSearchParams(window.location.search).get('roomId') || ""
          }
          placeholder="Room Code"
          className="p-2 rounded bg-gray-800 text-white"
        />

        <button
          onClick={joinRoom}
          className="bg-blue-600 p-2 rounded text-white"
        >
          Join Room
        </button>

      </div>

    </main>
  )

}


function App() {

  const editorRef = useRef(null)
  const providerRef = useRef(null)

  const searchParams = new URLSearchParams(window.location.search)

  const [isHost] = useState(
    searchParams.get("host") === "true"
  )

  const [username, setUsername] = useState(() => {
    return searchParams.get('username') || ''
  })

  const [roomId, setRoomId] = useState(() =>{
    return searchParams.get('roomId') || ''
  })

  const [hostUsername] = useState(
    searchParams.get("hostUser") || ""
  )

  console.log({
    username,
    hostUsername,
    isHost
  })

  const [users, setUsers] = useState([])
  const [output, setOutput] = useState('')

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc])

  const handleMount = (editor) => {
    editorRef.current = editor

    if (providerRef.current) {
      new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      )
    }
  }

  const runCode = async () => {
    if (!editorRef.current) return

    const code = editorRef.current.getValue()


    try {
      const res = await fetch(`${BACKEND_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()
      setOutput(data.output || 'No output')
    } catch (err) {
      console.error(err)
      setOutput('Error connecting to server')
    }
  }

  useEffect(() => {
    if (!username || !roomId) return

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
      isHost
    })

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values())

      const uniqueUsers = Array.from(
        new Map(
          states
            .map(state => state.user)
            .filter(user => user?.username)
            .map(user => [user.username, user])
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

  }, [username,roomId,ydoc])

  if (!username || !roomId) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <RoomSelection
          setUsername={setUsername}
          setRoomId={setRoomId}
        />
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">

      {/* Sidebar */}
      <aside className='h-full w-1/4 bg-gray-400 rounded-lg'>
        <div className='p-4 border-b border-gray-300'>

          <h2 className='text-xl font-bold'>
            Active Users
          </h2>

          <div className='mt-3 text-sm'>
            <span className='font-semibold'>
              Room:
            </span>{" "}
            {roomId}
          </div>

        {/* //--------------------COPY ROOM CODE BUTTON---------------------------// */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}?roomId=${roomId}`
              )
              alert("Room code copied!")
            }}
            className='mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm'
          >
            Copy Room Code
          </button>
        {/* //---------------------------------------------------------------------// */}

      </div>

        <ul className='p-4'>
          {users.map((user, index) => (
            <li
              key={index}
              className='p-2 rounded mb-2 text-white flex justify-between items-center'
              style={{ backgroundColor: user.color }}
            >
              <span>{user.username}</span>

              {user.isHost && (
                <span title="Room Creator">
                  👑
                </span>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor + Output */}
      <section className='w-3/4 bg-neutral-800 rounded-lg overflow-hidden flex flex-col'>

        {/* Run Button */}
        <div className="p-2 flex justify-end bg-neutral-900">
          <button
            onClick={runCode}
            className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-white"
          >
            ▶ Run
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// Write your code here"
            theme="vs-dark"
            onMount={handleMount}
          />
        </div>

        {/* Output */}
        <div className="h-40 bg-black text-green-400 p-3 overflow-auto border-t border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Output:</div>
          <pre className="text-sm whitespace-pre-wrap">{output}</pre>
        </div>

      </section>

    </main>
  )
}

export default App