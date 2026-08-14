export function AppHeader({ active }: { active?: "releases" | "versions" | "team" | "settings" }) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a href="/releases" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="brand-mark" width={26} height={26} />
          handofflog
        </a>
        <nav className="nav">
          <a href="/releases" className={active === "releases" ? "active" : ""}>
            Releases
          </a>
          <a href="/versions" className={active === "versions" ? "active" : ""}>
            Versiyonlar
          </a>
          <a href="/team" className={active === "team" ? "active" : ""}>
            Ekip
          </a>
          <a href="/settings" className={active === "settings" ? "active" : ""}>
            Ayarlar
          </a>
        </nav>
      </div>
    </header>
  );
}
