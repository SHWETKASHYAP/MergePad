import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { YSocketIO } from 'y-socket.io/dist/server'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

const ALLOWED_ORIGINS = [
  'http://localhost:5173',   
  'http://localhost:5000',   
  process.env.FRONTEND_URL,  
].filter(Boolean)            // removes undefined if env var not set

app.use(express.json())

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
}))

// ----------------- Socket.IO ---------------------------------- 
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()

//-----------------handle custom socket events -------------------------
io.on('connection', (socket) => {
  //Clients joins a room on the custom socket
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
  })
})

// --------------------------------- Routes --------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy', success: true })
})

app.post('/run', (req, res) => {
  const { code, roomId, username } = req.body

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

    const result = {
      output: output || 'Code executed successfully (no output)',
      ranBy: username || 'Someone', //who ran the code
    }

    //Broadcast output to all users in the room
    if(roomId){
      io.to(roomId).emit('code-output',result)
    }

    res.json(result)

  } catch (err) {
    console.log = originalLog

    const result = {
      output: err.message,
      ranBy: username || 'Someone', 
    }

    if(roomId){
      io.to(roomId).emit('code-output',result)
    }

    res.json({ result })
  }
})


const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
})