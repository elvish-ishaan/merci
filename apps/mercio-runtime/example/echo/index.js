// Echoes back the full request as JSON — useful for debugging headers, body, query.
// Upload with no build command, entry: index.js
//
// Test: curl -X POST "http://localhost:3001/mercio/<id>?foo=bar" \
//   -H "content-type: application/json" \
//   -d '{"message":"hi"}'

module.exports = async (req) => {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body,
      },
      null,
      2
    ),
  }
}
