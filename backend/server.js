import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { YSocketIO } from "y-socket.io/dist/server"
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const httpServer = createServer(app)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://merge-pad-alb-1288233658.ap-northeast-1.elb.amazonaws.com"
  ],
  methods: ["GET", "POST"]
}))

app.use(express.static(path.join(__dirname, 'public')))

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"] // fallback support
})

const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()

app.get('/health', (req, res) => {
  res.status(200).json({
    message: "Your server is working",
    success: true
  })
})

app.post('/run', (req, res) => {
  const { code } = req.body

  if (!code) {
    return res.status(400).json({ output: "No code provided" })
  }

  let output = ''
  const originalLog = console.log

  try {
    console.log = (...args) => {
      output += args.join(' ') + '\n'
    }

    eval(code)

    console.log = originalLog

    res.json({
      output: output || "Code executed successfully (no output)"
    })

  } catch (err) {
    console.log = originalLog

    res.json({
      output: err.message
    })
  }
})

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})