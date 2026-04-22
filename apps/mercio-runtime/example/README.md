# Mercio examples

Ready-to-upload example functions. Each folder is one deployable function.

## Examples

| Folder        | What it does                                      | Build command  | Entry      |
|---------------|---------------------------------------------------|----------------|------------|
| `hello-world` | Returns `{ hello: "<name>" }` from a query param  | _(none)_       | `index.js` |
| `echo`        | Echoes the full request back as JSON              | _(none)_       | `index.js` |
| `json-api`    | Tiny in-memory CRUD API with routing              | _(none)_       | `index.js` |
| `with-deps`   | Uses the `ms` npm package, shows dependency flow  | run `npm install` locally before zipping | `index.js` |
| `hono-app`    | Hono web framework — routing, params, JSON        | run `npm install` locally before zipping | `index.js` |
| `hono-ts`     | Hono + TypeScript — typed routes, interfaces, generics | run `npm install` locally before zipping | `index.ts` |

---

## Quickstart

### 1. Zip an example

```bash
cd apps/mercio-runtime/example
bash zip.sh hello-world
# → hello-world.zip
```

Or manually on any OS:
```bash
cd hello-world && zip -r ../hello-world.zip . && cd ..
```

### 2. Get a JWT

Log in via the web UI or:
```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"yourpassword"}' \
  | jq -r .token
```

### 3. Upload

```bash
TOKEN="<your-jwt>"

curl -X POST http://localhost:3001/api/mercio/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "zip=@hello-world.zip" \
  -F "name=hello-world" \
  -F "entry=index.js"
```

For the `with-deps`, `hono-app`, and `hono-ts` examples, install dependencies locally before zipping:
```bash
cd with-deps && npm install && cd ..
bash zip.sh with-deps

cd hono-app && npm install && cd ..
bash zip.sh hono-app

cd hono-ts && npm install && cd ..
bash zip.sh hono-ts
```

Response:
```json
{
  "id": "abc123",
  "name": "hello-world",
  "status": "QUEUED",
  "invokeUrl": "http://localhost:3001/mercio/abc123"
}
```

### 4. Poll until deployed

```bash
ID="abc123"

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/mercio/$ID | jq .function.status
# "QUEUED" → "BUILDING" → "DEPLOYED"
```

### 5. Invoke

```bash
# hello-world
curl "http://localhost:3001/mercio/$ID?name=mercy"
# {"hello":"mercy","method":"GET","path":"/"}

# echo — POST with body
curl -X POST "http://localhost:3001/mercio/$ID?foo=bar" \
  -H "content-type: application/json" \
  -d '{"msg":"hello"}'

# json-api — create an item
curl -X POST "http://localhost:3001/mercio/$ID/items" \
  -H "content-type: application/json" \
  -d '{"name":"apple"}'

# json-api — list items
curl "http://localhost:3001/mercio/$ID/items"

# with-deps
curl "http://localhost:3001/mercio/$ID?ms=86400000"
# {"input":86400000,"human":"1d"}

# hono-app — root
curl "http://localhost:3001/mercio/$ID"
# {"message":"Hello from Hono on Mercio!"}

# hono-app — path param
curl "http://localhost:3001/mercio/$ID/hello/world"
# {"message":"Hello, world!"}

# hono-app — POST echo
curl -X POST "http://localhost:3001/mercio/$ID/echo" \
  -H "content-type: application/json" \
  -d '{"test":true}'
# {"echo":{"test":true}}

# hono-ts — list users (typed response)
curl "http://localhost:3001/mercio/$ID/users"
# {"success":true,"data":[...],"timestamp":"..."}

# hono-ts — get user by id
curl "http://localhost:3001/mercio/$ID/users/1"

# hono-ts — create user
curl -X POST "http://localhost:3001/mercio/$ID/users" \
  -H "content-type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'
```

---

## Writing your own function

### Option A — Hono (recommended)

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ ok: true }))
app.get('/hello/:name', (c) => c.json({ message: `Hello, ${c.req.param('name')}!` }))
app.post('/data', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})

export default app
```

Rules:
- Set `"type": "module"` in `package.json` and add `hono` as a dependency.
- Run `npm install` before zipping — esbuild resolves Hono from your local `node_modules`.
- Use `entry=index.ts` (or `.js`) when uploading.
- All Hono features work: routing, middleware, path params, `c.json()`, `c.text()`, etc.

### Option B — Custom handler (legacy)

```js
module.exports = async (req) => {
  // req.method  — "GET", "POST", etc.
  // req.path    — "/some/path"
  // req.query   — { key: "value" }
  // req.headers — { "content-type": "..." }
  // req.body    — parsed JSON object, raw string, or null

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  }
}
```

Rules:
- Return `{ status, headers, body }` — all fields optional (defaults: 200, `{}`, `""`).
- `body` must be a **string** — call `JSON.stringify()` yourself.

---

General rules (both styles):
- If you have `package.json` with dependencies, run `npm install` locally before zipping.
- No file system writes at runtime — workerd V8 isolates have no disk access.
- State is **in-memory and per-process** — don't rely on it surviving a cold start or a pool eviction.
