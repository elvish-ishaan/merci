// Simplest possible mercio function.
// Zip this file alone, upload with no build command, entry: index.js
//
// Test: curl "http://localhost:3001/mercio/<id>?name=world"

module.exports = async (req) => {
  const name = req.query.name ?? 'world'

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: name, method: req.method, path: req.path }),
  }
}
