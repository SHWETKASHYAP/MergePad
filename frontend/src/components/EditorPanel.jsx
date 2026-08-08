import { useRef, useState, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function EditorPanel({ yText, providerRef, users, updateCursor, currentUsername, roomId, getSocket }) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const decorationsRef = useRef([])         // tracks active decorations so we can clear them
  const widgetsRef = useRef({})             // tracks active name widgets by username
  const [output, setOutput] = useState('')
  const [ranBy, setRanBy] = useState('')

  //Listen for code-output events from the backend and update output state
  useEffect(() => {
    const socket = getSocket ? getSocket() : null

    if(!socket) return 

    const handleOutput = ({ output, ranBy}) => {
      setOutput(output)
      setRanBy(ranBy)
    }

    socket.on('code-output', handleOutput)

    return () => {
      socket.off('code-output', handleOutput)
    }
  },[getSocket,users])

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
      // ── 1. Clear old decorations ──────────────────────────────────────────────
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])

    // ── 2. Remove old name widgets ────────────────────────────────────────────
    Object.values(widgetsRef.current).forEach((widget) => {
      editor.removeContentWidget(widget)
    })
    widgetsRef.current = {}

    // ── 3. Build new decorations + widgets for each remote user ───────────────
    const newDecorations = []

    users.forEach((user) => {
      // skip yourself
      if (user.username === currentUsername) return
      // skip users with no cursor data yet
      if (!user.cursor?.position) return

      const { position, selection } = user.cursor
      const color = user.color

      // ── Cursor line decoration (the blinking | ) ──────────────────────────
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

      // ── Name widget (floating label above cursor) ─────────────────────────
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

    // ── 4. Apply all new decorations at once ─────────────────────────────────
    decorationsRef.current = editor.deltaDecorations([], newDecorations)
  })

    // ── 5. Cleanup widgets on unmount ─────────────────────────────────────────
    return () => {
      Object.values(widgetsRef.current).forEach((widget) => {
        editor.removeContentWidget(widget)
      })
    }
  }, [users, currentUsername])

  const runCode = async () => {
    if (!editorRef.current) return

    const code = editorRef.current.getValue()

    try {
        await fetch(`${BACKEND_URL}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, roomId, username: currentUsername }),
        })
    } catch (err) {
      console.error(err)
      setOutput('Error connecting to server')
      setRanBy('')
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