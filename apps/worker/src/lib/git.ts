import { simpleGit } from 'simple-git'

export async function cloneRepo(repoUrl: string, destDir: string, token?: string): Promise<void> {
  const url = token ? repoUrl.replace('https://', `https://oauth2:${token}@`) : repoUrl
  await simpleGit().clone(url, destDir)
}
