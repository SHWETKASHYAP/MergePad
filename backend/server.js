import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { YSocketIO } from 'y-socket.io/dist/server'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

// ─── Allowed Origins ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // local dev
  'http://localhost:5000',   // local preview
  process.env.FRONTEND_URL,  // Vercel URL (set in Render environment variables)
].filter(Boolean)            // removes undefined if env var not set

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json())

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
}))

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy', success: true })
})

app.post('/run', (req, res) => {
  const { code } = req.body

  if (!code) {
    return res.status(400).json({ output: 'No code provided' })
  }

  let output = ''
  const originalLog = console.log

  try {
    console.log = (...args) => {
      output += args.join(' ') + '\n'
    }

    eval(code)

    console.log = originalLog
    res.json({ output: output || 'Code executed successfully (no output)' })

  } catch (err) {
    console.log = originalLog
    res.json({ output: err.message })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
})