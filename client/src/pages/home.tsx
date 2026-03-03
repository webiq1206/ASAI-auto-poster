export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-home">
      <div className="text-center space-y-6 max-w-lg px-4">
        <h1 className="text-4xl font-bold text-foreground" data-testid="text-app-title">
          Quantum Connect AI
        </h1>
        <p className="text-muted-foreground text-lg" data-testid="text-app-description">
          Automotive Sales Platform
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/api/health"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            data-testid="link-health-check"
          >
            Check API Health
          </a>
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium"
            data-testid="link-login"
          >
            Login
          </a>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="text-status">
          Foundation Ready — Skeleton Built
        </p>
      </div>
    </div>
  );
}
