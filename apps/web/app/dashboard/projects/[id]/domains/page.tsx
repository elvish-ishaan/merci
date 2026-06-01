export default function ProjectDomainsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-base font-semibold mb-1">Custom Domains</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Point your own domain to this project using a CNAME record.
      </p>
      <div className="border border-border rounded-lg p-10 text-center space-y-2">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs text-muted-foreground">
          Custom domain configuration will be available in a future release.
        </p>
      </div>
    </div>
  )
}
