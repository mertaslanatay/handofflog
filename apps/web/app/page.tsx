export default function Home() {
  return (
    <main>
      <h1>Handofflog</h1>
      <p>Figma tasarım değişikliklerini ekibin için release notlarına çevir.</p>
      <p>
        <a
          href="/api/auth/figma"
          style={{
            display: "inline-block",
            background: "#005a9e",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Figma ile giriş yap
        </a>
      </p>
    </main>
  );
}
