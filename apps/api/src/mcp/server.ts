import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { executeSandbox } from '../lib/sandbox-service'

export function createSandboxMcpServer(): McpServer {
  const server = new McpServer({
    name: 'merci-sandbox',
    version: '1.0.0',
  })

  server.registerTool(
    'execute_code',
    {
      title: 'Execute Code',
      description:
        'Run JavaScript or TypeScript code in an isolated sandbox container. ' +
        'Returns stdout, stderr, and exit code. Network access is disabled inside the sandbox.',
      inputSchema: {
        code: z.string().min(1).describe('The JS/TS source code to execute'),
        language: z.enum(['js', 'ts']).default('js').describe('Language: "js" for JavaScript, "ts" for TypeScript'),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(120)
          .default(30)
          .describe('Maximum execution time in seconds (1–120, default 30)'),
      },
    },
    async ({ code, language, timeout }) => {
      const result = await executeSandbox({ code, language, timeout })

      const lines: string[] = [
        `Exit code: ${result.exitCode}`,
        `Duration: ${result.durationMs}ms`,
      ]
      if (result.stdout) lines.push(`\nStdout:\n${result.stdout.trimEnd()}`)
      if (result.stderr) lines.push(`\nStderr:\n${result.stderr.trimEnd()}`)

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      }
    },
  )

  return server
}
