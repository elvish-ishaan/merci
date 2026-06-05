import { createLogger } from '@repo/logger'

const GH_API = 'https://api.github.com'
const USER_AGENT = 'merci-actions'
const logger = createLogger('merci-actions:github')

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  }
}

interface GHFileEntry {
  name: string
  path: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
}

interface GHFileContent {
  content: string
  encoding: 'base64' | 'utf-8'
}

export async function fetchWorkflowFiles(
  repoFullName: string,
  sha: string,
  token: string,
): Promise<Array<{ filename: string; content: string }>> {
  const listUrl = `${GH_API}/repos/${repoFullName}/contents/.github/workflows?ref=${sha}`
  logger.debug({ repoFullName, sha, url: listUrl }, '[github] listing workflow files')

  const listRes = await fetch(listUrl, { headers: ghHeaders(token) })
  logger.debug({ repoFullName, sha, status: listRes.status }, '[github] workflow list response')

  if (listRes.status === 404) {
    logger.warn({ repoFullName, sha }, '[github] .github/workflows directory not found (404)')
    return []
  }
  if (!listRes.ok) {
    const body = await listRes.text()
    throw new Error(`GitHub API error ${listRes.status} listing workflows: ${body}`)
  }

  const entries = (await listRes.json()) as GHFileEntry[]
  const yamlFiles = entries.filter(
    (e) => e.type === 'file' && (e.name.endsWith('.yml') || e.name.endsWith('.yaml')),
  )
  logger.debug({ repoFullName, sha, totalEntries: entries.length, yamlCount: yamlFiles.length, files: yamlFiles.map(f => f.name) }, '[github] found workflow files')

  const results: Array<{ filename: string; content: string }> = []

  for (const file of yamlFiles) {
    const fileUrl = `${GH_API}/repos/${repoFullName}/contents/${file.path}?ref=${sha}`
    logger.debug({ repoFullName, sha, filename: file.name }, '[github] fetching workflow file content')

    const fileRes = await fetch(fileUrl, { headers: ghHeaders(token) })
    if (!fileRes.ok) {
      logger.warn({ repoFullName, sha, filename: file.name, status: fileRes.status }, '[github] failed to fetch workflow file — skipping')
      continue
    }

    const data = (await fileRes.json()) as GHFileContent
    const content =
      data.encoding === 'base64'
        ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        : data.content

    logger.debug({ repoFullName, sha, filename: file.name, bytes: content.length }, '[github] ✓ workflow file fetched')
    results.push({ filename: file.name, content })
  }

  return results
}

export async function registerWebhook(
  repoFullName: string,
  webhookUrl: string,
  secret: string,
  token: string,
): Promise<number> {
  const res = await fetch(`${GH_API}/repos/${repoFullName}/hooks`, {
    method: 'POST',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push', 'pull_request'],
      config: { url: webhookUrl, content_type: 'json', secret, insecure_ssl: '0' },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to register webhook: ${res.status} ${body}`)
  }

  const data = (await res.json()) as { id: number }
  return data.id
}

export async function updateWebhookUrl(
  repoFullName: string,
  hookId: number,
  webhookUrl: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${GH_API}/repos/${repoFullName}/hooks/${hookId}/config`, {
    method: 'PATCH',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to update webhook URL: ${res.status} ${body}`)
  }
}

export async function deleteWebhook(
  repoFullName: string,
  hookId: number,
  token: string,
): Promise<void> {
  await fetch(`${GH_API}/repos/${repoFullName}/hooks/${hookId}`, {
    method: 'DELETE',
    headers: ghHeaders(token),
  })
}
