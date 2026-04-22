# Mercio examples

Ready-to-upload example functions. Each folder is one deployable function.

## Examples

| Folder        | What it does                                      | Build command  | Entry      |
|---------------|---------------------------------------------------|----------------|------------|
| `hello-world` | Returns `{ hello: "<name>" }` from a query param  | _(none)_       | `index.js` |
| `echo`        | Echoes the full request back as JSON              | _(none)_       | `index.js` |
| `json-api`    | Tiny in-memory CRUD API with routing              | _(none)_       | `index.js` |
| `with-deps`   | Uses the `ms` npm package, shows dependency flow  | `npm install`  | `index.js` |

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

For the `with-deps` example, add the build command:
```bash
curl -X POST http://localhost:3001/api/mercio/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "zip=@with-deps.zip" \
  -F "name=with-deps" \
  -F "buildCommand=npm install" \
  -F "entry=index.js"
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
```

---

## Writing your own function

Create a folder with at least an `index.js`:

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
- Entry file must use `module.exports = async (req) => ({...})`.
- Return `{ status, headers, body }` — all fields optional (defaults: 200, `{}`, `""`).
- `body` must be a **string** — call `JSON.stringify()` yourself.
- If you have `package.json` with dependencies, set `buildCommand` to `npm install` at upload time.
- No file system writes at runtime — workerd V8 isolates have no disk access.
- State is **in-memory and per-process** — don't rely on it surviving a cold start or a pool eviction.
