import express from 'express'
import cors from 'cors'
import auth from './src/routes/auth'
import deploy from './src/routes/deploy'
import appProxy, { assetFallback } from './src/routes/app'
import github from './src/routes/github'
import internal from './src/routes/internal'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/auth', auth)
app.use('/deploy', deploy)
app.use('/internal', internal)
app.use('/app', appProxy)
app.use('/', github)
app.use(assetFallback)

const port = process.env.PORT ?? 3001
app.listen(port, () => console.log(`API running on http://localhost:${port}`))
