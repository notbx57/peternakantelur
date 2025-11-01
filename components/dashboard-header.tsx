export default function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-popover">
            <span className="text-primary-foreground font-bold">🥚</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Egg&#39;o Meter </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground font-semibold">Updated : 32 seconds ago  </span>
        </div>
      </div>
    </header>
  )
}
