import { simpleGit } from 'simple-git'

export async function cloneRepo(repoUrl: string, destDir: string): Promise<void> {
  await simpleGit().clone(repoUrl, destDir)
}
