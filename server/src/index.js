import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import identifyRouter from './routes/identify.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
  })
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/', identifyRouter)

const port = Number(process.env.PORT || 3000)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
