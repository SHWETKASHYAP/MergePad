import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { YSocketIO } from "y-socket.io/dist/server"
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

app.use(express.json())
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"]
}))

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

const ySocketIO = new YSocketIO(io)
ySocketIO.initialize()


app.get('/',(req,res)=>{
    res.status(200).json({
        message:"Welcome to the backend server of MergePad",
        success:true
    })
})

app.get('/health',(req,res)=>{
    res.status(200).json({
        messaage:"Your server is working",
        success:true
    })
})

app.post('/run', (req, res) => {
  const { code } = req.body

  let output = ''
  const originalLog = console.log

  console.log = (...args) => {
    output += args.join(' ') + '\n'
  }

  try {
    eval(code)
    console.log = originalLog
    res.json({ output })
  } catch (err) {
    console.log = originalLog
    res.json({ output: err.message })
  }
})


httpServer.listen(3000, () => {
  console.log('Server is running on port 3000')
})