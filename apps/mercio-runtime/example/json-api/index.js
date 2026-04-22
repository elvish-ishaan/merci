// A tiny in-memory CRUD API — demonstrates routing, body parsing, and status codes.
// Upload with no build command, entry: index.js
//
// Test:
//   curl -X POST http://localhost:3001/mercio/<id>/items \
//     -H "content-type: application/json" -d '{"name":"apple"}'
//   curl http://localhost:3001/mercio/<id>/items
//   curl http://localhost:3001/mercio/<id>/items/0

// NOTE: state is per-isolate (process-lifetime), not persisted across restarts.
const items = []

module.exports = async (req) => {
  const segments = req.path.replace(/^\//, '').split('/')
  // segments[0] = '' or 'items', segments[1] = optional id

  const resource = segments[0]
  const id = segments[1] !== undefined ? Number(segments[1]) : null

  if (resource !== 'items') {
    return notFound()
  }

  if (req.method === 'GET' && id === null) {
    return ok(items)
  }

  if (req.method === 'GET' && id !== null) {
    const item = items[id]
    return item !== undefined ? ok(item) : notFound()
  }

  if (req.method === 'POST' && id === null) {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {}
    const item = { id: items.length, ...body, createdAt: new Date().toISOString() }
    items.push(item)
    return json(201, item)
  }

  if (req.method === 'DELETE' && id !== null) {
    if (items[id] === undefined) return notFound()
    items.splice(id, 1)
    return ok({ deleted: true })
  }

  return json(405, { error: 'Method not allowed' })
}

function ok(data) {
  return json(200, data)
}

function notFound() {
  return json(404, { error: 'Not found' })
}

function json(status, data) {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  }
}
