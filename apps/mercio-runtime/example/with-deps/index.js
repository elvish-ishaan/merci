// Demonstrates using an npm dependency (ms — human-readable time strings).
// Upload with:
//   buildCommand: npm install
//   entry: index.js
//
// Test: curl "http://localhost:3001/mercio/<id>?ms=72000000"

const ms = require('ms')

module.exports = async (req) => {
  const input = req.query.ms

  if (!input) {
    return {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Pass ?ms=<milliseconds> or ?ms=<string like "2 days">' }),
    }
  }

  const numeric = Number(input)
  const result = Number.isNaN(numeric)
    ? { input, milliseconds: ms(input) }
    : { input: numeric, human: ms(numeric) }

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result),
  }
}
