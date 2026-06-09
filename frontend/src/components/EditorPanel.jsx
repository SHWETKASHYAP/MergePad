import { useRef, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function EditorPanel({ yText, providerRef }) {
  const editorRef = useRef(null)
  const [output, setOutput] = useState('')

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

  return (
    <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden flex flex-col">

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
  )
}
