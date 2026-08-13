import { useRef, useState, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

//language display name -> { monacoId, compilerId }
const LANGUAGES = [
  { label: 'JavaScript', monacoId: 'javascript', compilerId: 'javascript' },
  { label: 'Python',     monacoId: 'python',     compilerId: 'python-3.14' },
  { label: 'TypeScript', monacoId: 'typescript', compilerId: 'typescript-deno'  },
  { label: 'C++',        monacoId: 'cpp',         compilerId: 'g++-15' },
  { label: 'Java',       monacoId: 'java',        compilerId: 'openjdk-25' },
  { label: 'Go',         monacoId: 'go',          compilerId: 'go-1.26'    },
]

export function EditorPanel({ yText, providerRef, users, updateCursor, currentUsername, roomId, getSocket }) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const decorationsRef = useRef([])         // tracks active decorations so we can clear them
  const widgetsRef = useRef({})             // tracks active name widgets by username
  const [output, setOutput] = useState('')
  const [ranBy, setRanBy] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0])
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)

  const isJS = selectedLang.compilerId === 'javascript'

  //Listen for code-output events from the backend and update output state
  useEffect(() => {
    const socket = getSocket ? getSocket() : null

    if(!socket) return 

    const handleOutput = ({ output, ranBy}) => {
      setOutput(output)
      setRanBy(ranBy)
      setIsRunning(false)
    }

    socket.on('code-output', handleOutput)

    return () => {
      socket.off('code-output', handleOutput)
    }
  },[getSocket,users])

  //--------------------- Switch monaco language on change in dropdown -----------------------------

  const handleLanguageChange = (e) => {

    const lang = LANGUAGES.find(l => l.compilerId === e.target.value)
    if(!lang) return
    setSelectedLang(lang)
    setShowStdin(false)   // collapse stdin when switching language
    setStdin('')

    // update Monaco syntax highlighting
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(
        editorRef.current.getModel(),
        lang.monacoId
      )
    }

  }

  const handleMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    if (providerRef.current) {
      new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      )
    }

    // broadcast this user's cursor position whenever it changes
    editor.onDidChangeCursorSelection((e) => {
      const position = editor.getPosition()
      if (!position) return

      updateCursor(
        {
          lineNumber: position.lineNumber,
          column: position.column,
        },
        {
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn,
        }
      )
    })
  }

  // render remote cursors whenever users state changes
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    //wrap in requestAnimation frame to avoid recursive deltaDecorations calls 
    const frameId = requestAnimationFrame(() => {
      // ------------------------------------- 1. Clear old decorations -------------------------------------------------------------------
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])

    // --------------------------------------- 2. Remove old name widgets ------------------------------------------------------------------
    Object.values(widgetsRef.current).forEach((widget) => {
      editor.removeContentWidget(widget)
    })
    widgetsRef.current = {}

    // --------------------------------------- 3. Build new decorations + widgets for each remote user ---------------------------------------
    const newDecorations = []

    users.forEach((user) => {
      // skip yourself
      if (user.username === currentUsername) return
      // skip users with no cursor data yet
      if (!user.cursor?.position) return

      const { position, selection } = user.cursor
      const color = user.color

      // ----------------------------------------- Cursor line decoration (the blinking | ) ---------------------------------------
      // inject a CSS class dynamically per user color
      const cursorClassName = `remote-cursor-${user.username.replace(/\s+/g, '-')}`
      const selectionClassName = `remote-selection-${user.username.replace(/\s+/g, '-')}`

      // inject styles into document if not already there
      if (!document.getElementById(cursorClassName)) {
        const style = document.createElement('style')
        style.id = cursorClassName
        style.innerHTML = `
          .${cursorClassName} {
            border-left: 2px solid ${color};
            margin-left: -1px;
          }
          .${selectionClassName} {
            background-color: ${color}33;
          }
        `
        document.head.appendChild(style)
      }

      // cursor decoration
      newDecorations.push({
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: cursorClassName,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })

      // selection highlight (if user has text selected)
      const hasSelection =
        selection &&
        !(
          selection.startLineNumber === selection.endLineNumber &&
          selection.startColumn === selection.endColumn
        )

      if (hasSelection) {
        newDecorations.push({
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: selectionClassName,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        })
      }

      // ---------------------------- Name widget (floating label above cursor) --------------------------------------
      const widgetId = `cursor-widget-${user.username}`

      const domNode = document.createElement('div')
      domNode.className = 'cursor-name-widget'
      domNode.textContent = user.username
      domNode.style.cssText = `
        background-color: ${color};
        color: white;
        font-size: 11px;
        font-family: monospace;
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 100;
      `

      const widget = {
        getId: () => widgetId,
        getDomNode: () => domNode,
        getPosition: () => ({
          position: {
            lineNumber: position.lineNumber,
            column: position.column,
          },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
            monaco.editor.ContentWidgetPositionPreference.BELOW,
          ],
        }),
      }

      editor.addContentWidget(widget)
      widgetsRef.current[user.username] = widget
    })

    // ----------------------- 4. Apply all new decorations at once -----------------------------------
    decorationsRef.current = editor.deltaDecorations([], newDecorations)
  })

    // ------------------------ 5. Cleanup widgets on unmount -----------------------------------------
    return () => {
      cancelAnimationFrame(frameId)
      Object.values(widgetsRef.current).forEach((widget) => {
        editor.removeContentWidget(widget)
      })
    }
  }, [users, currentUsername])

  const runCode = async () => {
    if (!editorRef.current || isRunning) return

    setIsRunning(true)
    setOutput('Running...')
    setRanBy('')

    const code = editorRef.current.getValue()

    try {
        await fetch(`${BACKEND_URL}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, roomId, username: currentUsername, language: selectedLang.compilerId,input: stdin }),
        })
    } catch (err) {
      console.error(err)
      setOutput('Error connecting to server')
      setRanBy('')
      setIsRunning(false)
    }
  }

  return (
    <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden flex flex-col">
 
      {/* ── Toolbar ── */}
      <div className="p-2 flex justify-between items-center bg-neutral-900">
 
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={selectedLang.compilerId}
            onChange={handleLanguageChange}
            className="bg-neutral-700 text-white text-sm px-3 py-1 rounded border border-neutral-600 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.compilerId} value={lang.compilerId}>
                {lang.label}
              </option>
            ))}
          </select>
 
          {/* Stdin toggle — only for non-JS languages */}
          {!isJS && (
            <button
              onClick={() => setShowStdin(prev => !prev)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                showStdin
                  ? 'bg-neutral-500 border-neutral-400 text-white'
                  : 'bg-transparent border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400'
              }`}
              title="Toggle stdin input"
            >
              stdin {showStdin ? '▲' : '▼'}
            </button>
          )}
        </div>
 
        {/* Run Button */}
        <button
          onClick={runCode}
          disabled={isRunning}
          className={`px-4 py-1 rounded text-white text-sm ${
            isRunning
              ? 'bg-neutral-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isRunning ? '⏳ Running...' : '▶ Run'}
        </button>
 
      </div>
 
      {/* ── Stdin Input — collapsible, only for non-JS ── */}
      {!isJS && showStdin && (
        <div className="bg-neutral-900 border-t border-neutral-700 px-3 py-2">
          <div className="text-neutral-400 text-xs mb-1">stdin (one value per line)</div>
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder="Enter input here..."
            rows={3}
            className="w-full bg-neutral-800 text-white text-sm font-mono px-2 py-1 rounded border border-neutral-600 focus:outline-none resize-none placeholder-neutral-600"
          />
        </div>
      )}
 
      {/* ── Editor ── */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Write your code here"
          theme="vs-dark"
          onMount={handleMount}
        />
      </div>
 
      {/* ── Output ── */}
      <div className="h-40 bg-black text-green-400 p-3 overflow-auto border-t border-gray-700">
        <div className="text-gray-400 text-sm mb-1">
          Output:
          {ranBy && (
            <span className="ml-2 text-yellow-400 text-xs">
              ▶ ran by {ranBy}
            </span>
          )}
        </div>
        <pre className="text-sm whitespace-pre-wrap">{output}</pre>
      </div>
 
    </section>
  )
}