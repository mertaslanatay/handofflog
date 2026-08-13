export function AppHeader({ active }: { active?: "releases" | "versions" | "settings" }) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a href="/releases" className="brand">
          <span className="brand-mark" />
          Handofflog
        </a>
        <nav className="nav">
          <a href="/releases" className={active === "releases" ? "active" : ""}>
            Releases
          </a>
          <a href="/versions" className={active === "versions" ? "active" : ""}>
            Versiyonlar
          </a>
          <a href="/settings" className={active === "settings" ? "active" : ""}>
            Ayarlar
          </a>
        </nav>
      </div>
    </header>
  );
}
