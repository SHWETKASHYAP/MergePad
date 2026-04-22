import './App.css'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from 'react'
import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'

const BACKEND_URL = import.meta.env.VITE_API_URL


if (!BACKEND_URL) {
  throw new Error("VITE_API_URL is missing")
}


function getColorFromUsername(username) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}


function App() {

  const editorRef = useRef(null)
  const providerRef = useRef(null)

  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get('username') || ''
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

  const handleJoin = (e) => {
    e.preventDefault()
    const name = e.target.username.value
    setUsername(name)
    window.history.pushState({}, '', `?username=${name}`)
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
    if (!username) return

    const provider = new SocketIOProvider(
      BACKEND_URL,
      'monaco',
      ydoc,
      { autoConnect: true }
    )

    providerRef.current = provider

    provider.awareness.setLocalStateField('user', {
      username,
      color: getColorFromUsername(username),
      clientId: ydoc.clientID
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

  }, [username, ydoc])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <form onSubmit={handleJoin} className='flex flex-col gap-4'>
          <input
            type="text"
            placeholder='Enter your username'
            className='p-2 rounded-lg bg-gray-800 text-white'
            name='username'
          />
          <button className='p-2 rounded-lg bg-blue-600 text-white'>
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">

      {/* Sidebar */}
      <aside className='h-full w-1/4 bg-gray-400 rounded-lg'>
        <h2 className='text-xl font-bold p-4 border-b border-gray-300'>
          Active Users
        </h2>

        <ul className='p-4'>
          {users.map((user, index) => (
            <li
              key={index}
              className='p-2 rounded mb-2 text-white'
              style={{ backgroundColor: user.color }}
            >
              {user.username}
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