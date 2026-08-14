export default function Home() {
  return (
    <main className="center-screen">
      <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.png" alt="Handofflog" className="login-logo" />
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
          Figma tasarım değişikliklerini ekibin için nokta atışı changelog&apos;a çevir.
        </p>
        <a href="/api/auth/figma" className="btn btn-primary" style={{ width: "100%" }}>
          Figma ile giriş yap
        </a>
      </div>
    </main>
  );
}
