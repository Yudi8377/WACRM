"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Database,
  Download,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import {
  evaluateEditionQuota,
  getEditionMatrixCapabilities,
  loadCommercialSession,
  saveCommercialSession,
  type CommercialUserSession,
} from "@/lib/access-control";
import {
  authenticateWithBiometric,
  buildBiometricSessionFallback,
  detectBiometricCapability,
  enrollBiometricForSession,
  getEnrolledBiometricForEmail,
  getLatestEnrolledBiometricProfile,
  removeEnrolledBiometricProfile,
  type BiometricCapability,
  type EnrolledBiometricProfile,
} from "@/lib/biometric-auth";
import {
  COMPANION_FAB_EVENT,
  loadCompanionFabVisible,
  saveCompanionFabVisible,
} from "@/lib/warm-voice";
import type { AppEditionId, MemberRole, StoreBusinessProfile, TeamMemberRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface SettingsViewProps {
  adapter: WorkspaceAdapter;
  editionId?: AppEditionId;
  licenseMaxSeats?: number | null;
  commercialUser?: CommercialUserSession | null;
  workspaceName: string;
  workspaceSlug: string;
  storeProfile: StoreBusinessProfile;
  onSaveStoreProfile: (next: StoreBusinessProfile) => void;
  onUpgradeRequest?: () => void;
  currentRole: MemberRole;
  members: TeamMemberRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function SettingsView({
  adapter,
  editionId = "starter",
  licenseMaxSeats,
  commercialUser,
  workspaceName,
  storeProfile,
  onSaveStoreProfile,
  onUpgradeRequest,
  currentRole,
  members,
  onRefresh,
  onToast,
}: SettingsViewProps) {
  const router = useRouter();
  const caps = getEditionMatrixCapabilities(editionId, licenseMaxSeats);
  const seatQuota = evaluateEditionQuota(editionId, "agents", members.length, licenseMaxSeats);
  const [businessName, setBusinessName] = useState(storeProfile.businessName);
  const [businessTagline, setBusinessTagline] = useState(storeProfile.businessTagline);
  const [phone, setPhone] = useState(storeProfile.phone);
  const [email, setEmail] = useState(storeProfile.email);
  const [address, setAddress] = useState(storeProfile.address);
  const [city, setCity] = useState(storeProfile.city);
  const [taxId, setTaxId] = useState(storeProfile.taxId);
  const [defaultCourier, setDefaultCourier] = useState(storeProfile.defaultCourier);
  const [invoiceFooter, setInvoiceFooter] = useState(storeProfile.invoiceFooter);
  const [customDomain, setCustomDomain] = useState(storeProfile.sovereignConfig?.customDomain ?? "");
  const [brandedApkName, setBrandedApkName] = useState(storeProfile.sovereignConfig?.brandedApkName ?? "");
  const [brandedPackageId, setBrandedPackageId] = useState(
    storeProfile.sovereignConfig?.brandedPackageId ?? "",
  );
  const [dedicatedDbRegion, setDedicatedDbRegion] = useState(
    storeProfile.sovereignConfig?.dedicatedDbRegion ?? "ap-southeast-1 (Singapore)",
  );
  const [saving, setSaving] = useState(false);
  const [biometricCap, setBiometricCap] = useState<BiometricCapability | null>(null);
  const [enrolledBio, setEnrolledBio] = useState<EnrolledBiometricProfile | null>(null);
  const [busyBio, setBusyBio] = useState(false);
  const [bioFeedback, setBioFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const companionFabVisible = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(COMPANION_FAB_EVENT, onStoreChange);
      return () => window.removeEventListener(COMPANION_FAB_EVENT, onStoreChange);
    },
    () => loadCompanionFabVisible(),
    () => false,
  );

  function resolveEffectiveSession(): CommercialUserSession | null {
    const stored = loadCommercialSession();
    if (stored) {
      // Ensure Sovereign / upgraded edition is always synced onto session before enrollment
      if (stored.editionId !== editionId) {
        const synced: CommercialUserSession = {
          ...stored,
          editionId,
          hasPaidLicense: stored.hasPaidLicense || editionId !== "starter",
        };
        saveCommercialSession(synced);
        return synced;
      }
      return stored;
    }
    if (commercialUser) {
      const synced: CommercialUserSession = {
        ...commercialUser,
        editionId,
        hasPaidLicense: commercialUser.hasPaidLicense || editionId !== "starter",
      };
      saveCommercialSession(synced);
      return synced;
    }
    const matchedMember =
      members.find((m) => m.role === currentRole) ?? members[0];
    const fallbackSlug =
      workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "owner";
    const resolvedEmail =
      (storeProfile.email || email || "").trim() || `${fallbackSlug}@workspace.wacrm`;
    const fallback = buildBiometricSessionFallback({
      email: resolvedEmail,
      displayName: matchedMember?.displayName || storeProfile.businessName || workspaceName,
      businessName: storeProfile.businessName || workspaceName,
      userId: matchedMember?.userId || matchedMember?.id,
      role: currentRole,
      editionId,
    });
    if (fallback) {
      saveCommercialSession(fallback);
    }
    return fallback;
  }

  useEffect(() => {
    let active = true;
    const stored = loadCommercialSession();
    const activeEmail = stored?.email || commercialUser?.email || storeProfile.email;
    detectBiometricCapability()
      .then((cap) => {
        if (!active) return;
        setBiometricCap(cap);
        const existing = activeEmail
          ? getEnrolledBiometricForEmail(activeEmail)
          : getLatestEnrolledBiometricProfile();
        setEnrolledBio(existing);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [commercialUser?.email, storeProfile.email]);

  async function handleEnrollBiometric(forcePin = false) {
    setBioFeedback(null);
    const sess = resolveEffectiveSession();
    if (!sess) {
      const msg =
        "Email akun belum ditemukan. Isi kolom Email di Profil Usaha lalu klik Simpan, atau masuk ulang dengan email Anda.";
      setBioFeedback({ tone: "error", text: msg });
      onToast(msg, "error");
      return;
    }

    if ((forcePin || biometricCap?.method === "device_pin") && !pinCode.trim()) {
      setShowPinFallback(true);
      setBioFeedback({
        tone: "error",
        text: "Masukkan 6 digit angka PIN Cepat di bawah, lalu ketuk Simpan Kunci Cepat.",
      });
      return;
    }

    setBusyBio(true);
    try {
      // Pass pre-detected biometricCap so WebAuthn runs synchronously inside the tap gesture!
      const res = await enrollBiometricForSession(sess, {
        capability: biometricCap,
        forceDevicePin: forcePin || biometricCap?.method === "device_pin",
        pinCode: pinCode.trim() || undefined,
      });
      if (!res.ok || !res.profile) {
        const errText = res.error || "Gagal mengaktifkan Sidik Jari / Face ID.";
        setBioFeedback({ tone: "error", text: errText });
        if (res.fallbackPinSuggested) {
          setShowPinFallback(true);
        }
        onToast(errText, "error");
        return;
      }
      setEnrolledBio(res.profile);
      setShowPinFallback(false);
      setPinCode("");
      const methodName =
        res.profile.method === "device_pin"
          ? "Kunci Cepat PIN 6-Digit Terenkripsi"
          : biometricCap?.label || "Sidik Jari / Face ID";
      const okMsg = `Berhasil! ${methodName} aktif untuk ${res.profile.email} (${editionId.toUpperCase()}).`;
      setBioFeedback({ tone: "ok", text: okMsg });
      onToast(okMsg);
    } finally {
      setBusyBio(false);
    }
  }

  async function handleTestBiometric() {
    if (!enrolledBio) return;
    setBioFeedback(null);
    setBusyBio(true);
    try {
      if (enrolledBio.method === "device_pin" && !pinCode.trim()) {
        setShowPinFallback(true);
        setBioFeedback({
          tone: "error",
          text: "Ketik PIN 6-Digit Anda di kotak di atas lalu klik 'Tes Verifikasi' untuk memverifikasi.",
        });
        return;
      }
      const res = await authenticateWithBiometric(
        enrolledBio.email,
        enrolledBio.method === "device_pin" ? pinCode.trim() : undefined,
      );
      if (!res.ok) {
        const msg = res.error || "Tes verifikasi gagal.";
        setBioFeedback({ tone: "error", text: msg });
        onToast(msg, "error");
        return;
      }
      const okMsg = `✓ Tes Biometrik BERHASIL untuk ${enrolledBio.email} (${enrolledBio.editionId.toUpperCase()})!`;
      setBioFeedback({ tone: "ok", text: okMsg });
      setPinCode("");
      onToast(okMsg);
    } finally {
      setBusyBio(false);
    }
  }

  function handleDisableBiometric() {
    const sess = loadCommercialSession();
    const targetEmail = enrolledBio?.email || sess?.email || commercialUser?.email;
    if (!targetEmail) return;
    removeEnrolledBiometricProfile(targetEmail);
    setEnrolledBio(null);
    setBioFeedback(null);
    onToast("Login Biometrik untuk perangkat ini telah dinonaktifkan.");
  }

  function handleDownloadEncryptedBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: "WACRM v5.0",
      workspaceName,
      editionId,
      storeProfile,
      membersCount: members.length,
      integrityChecksum: `SHA-${Date.now().toString(36).toUpperCase()}`,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wacrm-backup-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Backup Brankas Workspace (JSON) berhasil diunduh ke perangkat Anda!");
  }

  async function handleSaveBusinessProfile(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    try {
      const next: StoreBusinessProfile = {
        ...storeProfile,
        businessName: businessName.trim(),
        businessTagline: businessTagline.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        taxId: taxId.trim(),
        defaultCourier: defaultCourier.trim() || "JNE Reguler",
        invoiceFooter: invoiceFooter.trim(),
        ...(caps.customBrandedApk || caps.dedicatedDbSla
          ? {
              sovereignConfig: {
                customDomain: customDomain.trim(),
                brandedApkName: brandedApkName.trim(),
                brandedPackageId: brandedPackageId.trim(),
                dedicatedDbRegion: dedicatedDbRegion.trim(),
              },
            }
          : {}),
      };
      onSaveStoreProfile(next);
      if (canManage && businessName.trim() !== workspaceName) {
        await adapter.updateWorkspace(businessName.trim());
        await onRefresh();
      }
      onToast(
        "Profil Toko & Usaha disimpan! Seluruh Invoice, Label Pengiriman QR & Laporan kini memakai identitas usaha Anda.",
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan profil usaha.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: TeamMemberRecord, role: MemberRole) {
    try {
      await adapter.updateMember(member.id, { role });
      await onRefresh();
      onToast(`Peran ${member.displayName} diubah menjadi ${role}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengubah peran.", "error");
    }
  }

  async function handleRemoveMember(member: TeamMemberRecord) {
    if (!window.confirm(`Keluarkan ${member.displayName} dari tim usaha ini?`)) return;
    try {
      await adapter.deleteMember(member.id);
      await onRefresh();
      onToast("Anggota tim dikeluarkan.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengeluarkan anggota.", "error");
    }
  }

  async function handleDeleteWorkspace() {
    if (!window.confirm(`Hapus permanen ruang kerja "${storeProfile.businessName}" beserta seluruh datanya?`)) return;
    try {
      await adapter.deleteWorkspace();
      onToast("Ruang kerja dihapus.");
      if (adapter.mode === "neon") {
        router.replace("/dashboard");
        router.refresh();
      } else {
        await onRefresh();
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus ruang kerja.", "error");
    }
  }

  async function handleResetDemo() {
    if (!adapter.resetDemo) return;
    if (!window.confirm("Kembalikan data contoh lokal ke kondisi awal?")) return;
    await adapter.resetDemo();
    await onRefresh();
    onToast("Data contoh telah direset ke kondisi awal.");
  }

  const canManage = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Profil Usaha, Keamanan Biometrik &amp; Tim</h2>
          <p className="text-sm text-slate-500">
            Atur identitas toko/usaha, aktifkan login Sidik Jari / Face Recognition untuk HP, kelola Brankas Kepercayaan, serta hak akses tim Anda.
          </p>
        </div>

        {/* Biometric Login (Fingerprint & Face Recognition) + Trust & Security Shield */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Login Biometrik HP (Sidik Jari &amp; Face ID)
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    {biometricCap?.label || "Mendeteksi sensor biometrik perangkat..."}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                  enrolledBio
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {enrolledBio ? "AKTIF" : "BELUM AKTIF"}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              {enrolledBio
                ? enrolledBio.method === "device_pin"
                  ? `Kunci Cepat PIN 6-Digit aktif untuk akun ${enrolledBio.email} (${enrolledBio.editionId.toUpperCase()}). Berikutnya cukup masukkan 6 digit PIN cepat tanpa ketik sandi panjang.`
                  : `Biometrik aktif untuk akun ${enrolledBio.email} (${enrolledBio.editionId.toUpperCase()}). Berikutnya cukup 1 sentuhan Sidik Jari atau Face Recognition saat membuka aplikasi di HP.`
                : biometricCap?.detail ||
                  "Aktifkan Sidik Jari atau Face Recognition setelah aplikasi diinstall di HP agar masuk lebih cepat & anti intip sandi."}
            </p>

            {bioFeedback && (
              <div
                className={`mt-2.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                  bioFeedback.tone === "ok"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {bioFeedback.text}
              </div>
            )}

            {(showPinFallback || biometricCap?.method === "device_pin") && (
              <div className="mt-3 rounded-xl border border-cyan-200 bg-white p-3">
                <label className="block text-[11px] font-bold text-slate-800">
                  Kunci Cepat Perangkat (6 Digit Angka — Terenkripsi SHA-256)
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Contoh: 123456"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono tracking-[0.35em] text-slate-900 focus:border-cyan-500 focus:outline-none"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyBio || pinCode.length < 4}
                    onClick={() => void handleEnrollBiometric(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" /> Simpan Kunci Cepat PIN
                  </button>
                  {biometricCap?.method !== "device_pin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinFallback(false);
                        setPinCode("");
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Tutup
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap gap-2">
              {biometricCap?.method !== "device_pin" && (
                <button
                  type="button"
                  disabled={busyBio}
                  onClick={() => void handleEnrollBiometric(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-cyan-500 disabled:opacity-60"
                >
                  <Fingerprint className="h-3.5 w-3.5" />
                  {busyBio
                    ? "Memverifikasi Sensor..."
                    : enrolledBio
                      ? "Perbarui Sidik Jari / Face ID"
                      : "Aktifkan Sidik Jari / Face ID"}
                </button>
              )}
              {biometricCap?.method !== "device_pin" && !showPinFallback && (
                <button
                  type="button"
                  onClick={() => setShowPinFallback(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50"
                >
                  <Lock className="h-3.5 w-3.5" /> Gunakan PIN Cepat 6-Digit
                </button>
              )}
              {enrolledBio && (
                <button
                  type="button"
                  disabled={busyBio}
                  onClick={() => void handleTestBiometric()}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Tes Verifikasi
                </button>
              )}
              {enrolledBio && (
                <button
                  type="button"
                  onClick={handleDisableBiometric}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Nonaktifkan
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    WACRM Trust &amp; Security Shield
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Skor Keamanan: {enrolledBio ? "99/100 (Maksimal)" : "94/100 (Sangat Aman)"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                VERIFIED
              </span>
            </div>
            <ul className="mt-2.5 space-y-1 text-[11px] text-slate-600">
              <li>✓ Enkripsi SSL/TLS + Isolasi Lisensi Ketat Per-Akun (v5)</li>
              <li>✓ Proteksi Anti-XSS, Anti-SQL Injection &amp; Fraud COD AI</li>
              <li>✓ Printer Universal Plug &amp; Play (USB OTG, Bluetooth, WiFi, A4, EDC)</li>
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="pr-2">
                <p className="text-[11px] font-bold text-slate-800">Tombol Mengambang Asisten Suara AI</p>
                <p className="text-[10px] text-slate-500">
                  Disembunyikan otomatis di HP/Android agar layar lega (buka lewat ikon suara di bar atas).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !companionFabVisible;
                  saveCompanionFabVisible(next);
                  onToast(
                    next
                      ? "Tombol mengambang Asisten Suara AI ditampilkan."
                      : "Tombol mengambang Asisten Suara AI disembunyikan agar layar lebih rapi.",
                  );
                }}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                  companionFabVisible
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {companionFabVisible ? "Tampil" : "Tersembunyi"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownloadEncryptedBackup}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"
            >
              <Download className="h-3.5 w-3.5" /> 1-Klik Unduh Backup Brankas (JSON)
            </button>
          </div>
        </section>

        {/* White-Label Store / Business Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Identitas Toko / Usaha (Untuk Cetak Invoice, Label QR &amp; Laporan)</h3>
                <p className="text-xs text-slate-500">
                  {caps.whiteLabelStore
                    ? "100% White-Label Aktif — Nama usaha Anda menggantikan seluruh label sistem tanpa watermark WACRM."
                    : "Starter UMKM menambahkan watermark 'Powered by WACRM Starter UMKM' pada struk & invoice. Upgrade ke Growth Pro untuk 100% White-Label."}
                </p>
              </div>
            </div>
            {caps.whiteLabelStore ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% White-Label Aktif
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onUpgradeRequest?.()}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
              >
                <Lock className="h-3 w-3" /> White-Label Penuh (Growth Pro)
              </button>
            )}
          </div>

          <form onSubmit={handleSaveBusinessProfile} className="mt-4 space-y-3.5 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-semibold text-slate-700">
                Nama Toko / Perusahaan *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Toko Berkah Nusantara"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Tagline / Bidang Usaha
                <input
                  value={businessTagline}
                  onChange={(e) => setBusinessTagline(e.target.value)}
                  placeholder="Contoh: Grosir & Retail Terpercaya"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block font-semibold text-slate-700">
                No. Telepon / WhatsApp Toko
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812-3456-7890"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Email Usaha
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cs@tokoanda.id"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Kota Asal Pengiriman
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kota Kediri"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
            </div>

            <label className="block font-semibold text-slate-700">
              Alamat Lengkap Toko / Gudang (Pengirim pada Label Pengiriman QR)
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Dhoho No. 88, Kota Kediri, Jawa Timur"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-semibold text-slate-700">
                Kurir Pengiriman Default
                <input
                  value={defaultCourier}
                  onChange={(e) => setDefaultCourier(e.target.value)}
                  placeholder="JNE Reguler"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                NPWP Usaha (Opsional)
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="00.000.000.0-000.000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
            </div>

            <label className="block font-semibold text-slate-700">
              Catatan Kaki / Footer Invoice &amp; Struk
              <textarea
                rows={2}
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Profil Usaha"}
              </button>
            </div>
          </form>
        </section>

        {/* Team Members & RBAC */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="h-4 w-4 text-emerald-600" />
              Anggota Tim &amp; Kuota Kursi Lisensi ({members.length} /{" "}
              {seatQuota.isUnlimited ? "∞ Unlimited" : `${seatQuota.limit} agen`} · {caps.editionName})
            </h3>
            {!seatQuota.canAddMore && onUpgradeRequest && (
              <button
                type="button"
                onClick={onUpgradeRequest}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
              >
                <KeyRound className="h-3.5 w-3.5" /> Tambah Kuota Kursi
              </button>
            )}
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.displayName}</p>
                  <p className="text-xs text-slate-500">Status: {m.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    disabled={!canManage}
                    value={m.role}
                    onChange={(e) => handleRoleChange(m, e.target.value as MemberRole)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Keluarkan anggota"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sovereign Corporate Infrastructure: Custom Branded APK, Custom Domain & Dedicated Neon DB SLA 99.95% */}
        <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Infrastruktur Sovereign Corporate — Custom Domain, Branded Android APK &amp; Dedicated DB SLA 99.95%
                </h3>
                {!caps.customBrandedApk && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                    <Lock className="h-3 w-3" /> Sovereign Corporate
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Konfigurasi domain korporasi, aplikasi Android APK berlabel perusahaan Anda sendiri, dan klaster Neon PostgreSQL Dedicated SLA 99.95%.
              </p>
            </div>
            {!caps.customBrandedApk && onUpgradeRequest && (
              <button
                type="button"
                onClick={onUpgradeRequest}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                <KeyRound className="h-3.5 w-3.5" /> Aktifkan License Key Sovereign
              </button>
            )}
          </div>

          {!caps.customBrandedApk && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Mode Pratinjau — Lisensi aktif Anda (<strong>{caps.editionName}</strong>) belum membuka Custom Branded APK, Custom Domain &amp; Dedicated DB SLA 99.95%. Masukkan License Key <strong>Sovereign Corporate</strong> di menu Edisi &amp; Lisensi untuk mengaktifkan.
            </div>
          )}

          <div
            className={`mt-4 grid gap-3 text-xs sm:grid-cols-2 ${
              !caps.customBrandedApk ? "pointer-events-none select-none opacity-65" : ""
            }`}
          >
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-indigo-500" /> Custom Domain Korporasi
              </span>
              <input
                disabled={!caps.customBrandedApk}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="crm.perusahaananda.co.id"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Nama Aplikasi Android APK Berlabel Sendiri
              </span>
              <input
                disabled={!caps.customBrandedApk}
                value={brandedApkName}
                onChange={(e) => setBrandedApkName(e.target.value)}
                placeholder="Nusantara Retail CRM"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              Android Package ID (Play Store / Internal MDM)
              <input
                disabled={!caps.customBrandedApk}
                value={brandedPackageId}
                onChange={(e) => setBrandedPackageId(e.target.value)}
                placeholder="id.co.perusahaananda.crm"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Database className="h-3.5 w-3.5 text-cyan-600" /> Region Dedicated Neon DB &amp; SLA 99.95%
              </span>
              <select
                disabled={!caps.dedicatedDbSla}
                value={dedicatedDbRegion}
                onChange={(e) => setDedicatedDbRegion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="ap-southeast-1 (Singapore)">ap-southeast-1 (Singapore · SLA 99.95%)</option>
                <option value="ap-southeast-3 (Jakarta)">ap-southeast-3 (Jakarta · SLA 99.95%)</option>
                <option value="us-east-1 (Virginia)">us-east-1 (Virginia · SLA 99.95%)</option>
              </select>
            </label>
          </div>
          {caps.customBrandedApk && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
              <span>
                ✓ <strong>Sovereign Corporate Aktif:</strong> Simpan perubahan lewat tombol &ldquo;Simpan Profil Usaha&rdquo; di atas. Backup harian otomatis &amp; SLA 99.95% aktif.
              </span>
            </div>
          )}
        </section>

        {/* Reset / Danger Zone */}
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="text-sm font-bold text-red-900">
            {adapter.mode === "demo" ? "Reset Data Contoh" : "Zona Berbahaya"}
          </h3>
          <p className="mt-1 text-xs text-red-700">
            {adapter.mode === "demo"
              ? "Kembalikan seluruh data contoh ke kondisi awal."
              : "Menghapus ruang kerja akan menghapus seluruh kontak, percakapan, transaksi POS, dan koneksi kanal secara permanen."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {adapter.mode === "demo" ? (
              <button
                type="button"
                onClick={() => void handleResetDemo()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Data Contoh
              </button>
            ) : (
              currentRole === "owner" && (
                <button
                  type="button"
                  onClick={() => void handleDeleteWorkspace()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Ruang Kerja Permanen
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
