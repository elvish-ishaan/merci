import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello from Hono on Mercio!' }))

app.get('/hello/:name', (c) => c.json({ message: `Hello, ${c.req.param('name')}!` }))

app.post('/echo', async (c) => {
  const body = await c.req.json()
  return c.json({ echo: body })
})

export default app
