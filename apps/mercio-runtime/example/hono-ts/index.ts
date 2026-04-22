import { Hono } from 'hono'

interface User {
  id: number
  name: string
  email: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() }
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

const app = new Hono()

app.get('/', (c) =>
  c.json(ok({ message: 'Hono TypeScript app on Mercio!', routes: ['GET /users', 'GET /users/:id', 'POST /users'] }))
)

app.get('/users', (c) => c.json(ok(users)))

app.get('/users/:id', (c) => {
  const id = Number(c.req.param('id'))
  const user = users.find((u) => u.id === id)
  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404)
  }
  return c.json(ok(user))
})

app.post('/users', async (c) => {
  const body = await c.req.json<Omit<User, 'id'>>()
  if (!body.name || !body.email) {
    return c.json({ success: false, error: 'name and email are required' }, 400)
  }
  const newUser: User = { id: users.length + 1, ...body }
  users.push(newUser)
  return c.json(ok(newUser), 201)
})

export default app
