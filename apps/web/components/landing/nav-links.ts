export const navLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'Pricing', href: '#pricing' },
] as const

export const productLinks = [
  {
    name: 'Deployments',
    desc: 'Connect a GitHub repo and go live in seconds. Live build logs, custom domains, and auto HTTPS — all included.',
    href: '#deployments',
  },
  {
    name: 'Mercio',
    desc: 'Upload a JavaScript file and get a public API endpoint. No servers, no config — just your code running live.',
    href: '#mercio',
  },
  {
    name: 'Mercob',
    desc: 'Schedule any function to run on a cron, daily, or custom interval. Full retry control and run history.',
    href: '#mercob',
  },
  {
    name: 'Merci Actions',
    desc: 'CI that runs when you push. Bring your existing workflow files and watch every step stream live — no separate CI service.',
    href: '#merci-actions',
  },
  {
    name: 'Merci Sandbox',
    desc: 'Let your AI assistant run code safely. Every execution is isolated, resource-limited, and cleaned up automatically.',
    href: '#merci-sandbox',
  },
] as const
