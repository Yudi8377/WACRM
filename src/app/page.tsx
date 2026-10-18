import Link from "next/link";

const channels = [
  { name: "WhatsApp Business", status: "Prioritas integrasi", detail: "Cloud API resmi, webhook pesan dan status pesan." },
  { name: "Facebook Messenger", status: "Fondasi konektor", detail: "Pesan Halaman dan webhook sesuai izin Meta." },
  { name: "Instagram", status: "Fondasi konektor", detail: "DM akun profesional sesuai izin yang disetujui." },
  { name: "TikTok Business", status: "Fondasi konektor", detail: "Business Messaging API jika akun dan aplikasi memenuhi syarat." },
  { name: "YouTube", status: "Fondasi konektor", detail: "Komentar, balasan, kanal dan video melalui YouTube Data API." }
];

export default function HomePage() {
  return <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 24px" }}>
    <p style={{ color: "#2563eb", fontWeight: 700, letterSpacing: 2 }}>WACRM / WORKSPACE</p>
    <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.08, marginBottom: 12 }}>Semua percakapan pelanggan, satu ruang kerja.</h1>
    <p style={{ maxWidth: 700, color: "#5b6472", fontSize: 18, lineHeight: 1.7 }}>CRM omnichannel mandiri untuk tim layanan pelanggan. WhatsApp Business menjadi kanal pertama; konektor lain menyusul melalui API resmi dan izin platform yang sesuai.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
      <Link href="/sign-up" style={primaryButton}>Buat akun</Link>
      <Link href="/sign-in" style={secondaryButton}>Masuk</Link>
    </div>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginTop: 32 }}>
      {channels.map(channel => <article key={channel.name} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
        <p style={{ fontWeight: 700, marginTop: 0 }}>{channel.name}</p>
        <p style={{ fontSize: 12, color: "#2563eb", fontWeight: 700 }}>{channel.status}</p>
        <p style={{ color: "#5b6472", lineHeight: 1.6, marginBottom: 0 }}>{channel.detail}</p>
      </article>)}
    </section>
    <p style={{ marginTop: 28, color: "#6b7280", fontSize: 13 }}>Kanal belum aktif sampai kredensial, izin, webhook HTTPS, dan pengujian produksi selesai.</p>
  </main>;
}

const primaryButton = { display: "inline-block", background: "#1d4ed8", color: "white", borderRadius: 10, padding: "12px 18px", textDecoration: "none", fontWeight: 700 };
const secondaryButton = { display: "inline-block", background: "white", color: "#1d4ed8", border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 18px", textDecoration: "none", fontWeight: 700 };
