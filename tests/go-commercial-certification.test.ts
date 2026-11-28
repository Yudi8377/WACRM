import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { APP_EDITIONS, editionHasFeature, getEditionById } from "@/lib/editions";
import { evaluateTabAccess, getEditionMatrixCapabilities } from "@/lib/access-control";
import { buildMonthlyPayrollSummary, getDefaultHrdState } from "@/lib/hrd-payroll";
import {
  decryptConnectorToken,
  encryptConnectorToken,
} from "@/lib/connectors/token-crypto";
import { verifyMetaSignature } from "@/lib/connectors/meta-signature";
import { buildInitialPublisherState } from "../apps/publisher-admin/src/lib/publisher-store";
import {
  computeBalanceSheet,
  computeIncomeStatement,
  computeTrialBalance,
} from "../apps/publisher-admin/src/lib/accounting-engine";
import {
  buildDefaultPublisherAiAgents,
  buildFollowUpScript,
  buildWhatsappDeepLink,
  generateMultiAgentChatReply,
  qualifyWebsiteLead,
} from "../apps/publisher-admin/src/lib/publisher-ai-agents";
import {
  deleteEmployeeInState,
  deleteTenantInState,
  insertEmployeeInState,
  updateEmployeeInState,
  updateTenantInState,
} from "../apps/publisher-admin/src/lib/publisher-crud";

const REPO_ROOT = process.cwd();

function collectFilesRecursive(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursive(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe("WACRM v5.3.1 Go-Commercial 8-Gate Enterprise Certification Suite", () => {
  it("Gate 1: Commercial Editions, RBAC Access Control & HRD Payroll Integrity", () => {
    expect(APP_EDITIONS.length).toBeGreaterThanOrEqual(4);
    const starter = getEditionById("starter");
    const pro = getEditionById("pro");
    const enterprise = getEditionById("enterprise");
    const sovereign = getEditionById("sovereign");

    expect(starter.monthlyPriceIdr).toBe(0);
    expect(pro.monthlyPriceIdr).toBeGreaterThan(0);
    expect(enterprise.monthlyPriceIdr).toBeGreaterThan(pro.monthlyPriceIdr);
    expect(sovereign.monthlyPriceIdr).toBeGreaterThan(enterprise.monthlyPriceIdr);

    expect(editionHasFeature("sovereign", "sovereign_corporate_erp")).toBe(true);
    expect(editionHasFeature("starter", "sovereign_corporate_erp")).toBe(false);

    const caps = getEditionMatrixCapabilities("sovereign");
    expect(caps.hrdPayrollCorporate).toBe(true);
    expect(caps.voiceCompanion247).toBe(true);
    expect(caps.qrCameraFifoScanner).toBe(true);

    const sovAllowed = evaluateTabAccess("sovereign", "owner", "hrd_payroll");
    expect(sovAllowed.allowed).toBe(true);
    const entErpAllowed = evaluateTabAccess("enterprise", "owner", "erp");
    expect(entErpAllowed.allowed).toBe(true);
    const starterBlocked = evaluateTabAccess("starter", "agent", "hrd_payroll");
    expect(starterBlocked.allowed).toBe(false);

    const hrd = getDefaultHrdState();
    const payroll = buildMonthlyPayrollSummary(hrd, "November 2026");
    expect(payroll.lines.length).toBeGreaterThan(0);
    for (const line of payroll.lines) {
      expect(line.netTakeHomePayIdr).toBe(line.grossIncomeIdr - line.totalDeductionsIdr);
    }
  });

  it("Gate 2: AES-256-GCM Token Encryption, Meta HMAC Verification & Security Headers", () => {
    const keyBase64 = crypto.randomBytes(32).toString("base64");
    const secret = "EAAG-WACRM-COMMERCIAL-TOKEN-v531";
    const encrypted = encryptConnectorToken(secret, keyBase64);
    expect(encrypted.ciphertext).not.toContain(secret);
    expect(decryptConnectorToken(encrypted, keyBase64)).toBe(secret);

    // Tamper detection
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from("tampered-payload-invalid-tag").toString("base64"),
    };
    expect(() => decryptConnectorToken(tampered, keyBase64)).toThrow();

    const payload = JSON.stringify({ event: "wa_message", from: "+628123456789" });
    const appSecret = "wacrm-commercial-webhook-secret";
    const validSig =
      "sha256=" + crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
    expect(verifyMetaSignature(payload, validSig, appSecret)).toBe(true);
    expect(verifyMetaSignature(payload, "sha256=invalid", appSecret)).toBe(false);

    const nextCfg = fs.readFileSync(path.join(REPO_ROOT, "next.config.ts"), "utf8");
    expect(nextCfg).toContain("Strict-Transport-Security");
    expect(nextCfg).toContain("Permissions-Policy");
    expect(nextCfg).toContain("camera=(self)");
    expect(nextCfg).toContain("microphone=(self)");
  });

  it("Gate 3: Android Native v5.3.1 Hardware Permission Bridge (Camera, Mic, QR, Voice)", () => {
    const manifest = fs.readFileSync(
      path.join(REPO_ROOT, "android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(manifest).toContain("android.permission.CAMERA");
    expect(manifest).toContain("android.permission.RECORD_AUDIO");
    expect(manifest).toContain("android.permission.MODIFY_AUDIO_SETTINGS");
    expect(manifest).toContain("android.permission.POST_NOTIFICATIONS");

    const gradle = fs.readFileSync(path.join(REPO_ROOT, "android/app/build.gradle.kts"), "utf8");
    expect(gradle).toContain('versionName = "5.3.2"');
    expect(gradle).toContain("versionCode = 10");
    expect(gradle).toContain("enableV1Signing = true");
    expect(gradle).toContain("enableV2Signing = true");
    expect(gradle).toContain("enableV3Signing = true");

    const wf = fs.readFileSync(
      path.join(REPO_ROOT, ".github/workflows/android-release.yml"),
      "utf8",
    );
    expect(wf).toContain("apksigner");
    expect(wf).toContain("zipalign");
    expect(wf).toContain("assembleRelease");
    expect(fs.existsSync(path.join(REPO_ROOT, "src/app/api/download/android-apk/route.ts"))).toBe(
      true,
    );

    const mainAct = fs.readFileSync(
      path.join(REPO_ROOT, "android/app/src/main/java/com/wacrm/android/MainActivity.kt"),
      "utf8",
    );
    expect(mainAct).toContain("onPermissionRequest");
    expect(mainAct).toContain("onShowFileChooser");
    expect(mainAct).toContain("RESOURCE_VIDEO_CAPTURE");
    expect(mainAct).toContain("RESOURCE_AUDIO_CAPTURE");

    const bridge = fs.readFileSync(
      path.join(REPO_ROOT, "android/app/src/main/java/com/wacrm/android/WacrmJsBridge.kt"),
      "utf8",
    );
    expect(bridge).toContain("requestCameraAndMicPermissions");
    expect(bridge).toContain("bootstrapAllHardwarePermissions");
    expect(bridge).toContain("getHardwarePermissionsJson");
    expect(bridge).toContain("openAppPermissionSettings");
  });

  it("Gate 4: Go-Commercial Offline Installer Bundle Sources (Windows + Android Permission Auto-Fix)", () => {
    const bundleDir = path.join(REPO_ROOT, "installers/wacrm-commercial-bundle");
    const requiredFiles = [
      "Install-WACRM-Commercial-Suite.bat",
      "Fix-Camera-Mic-Permissions-1Click.bat",
      "Uninstall-WACRM-Commercial-Suite.bat",
      "Compile-SingleFile-Setup-EXE.bat",
      "WACRM-Commercial-Suite.iss",
      "README-GO-COMMERCIAL-INSTALLER.txt",
      "payload/Fix-WACRM-Hardware-Permissions.ps1",
      "payload/Setup-WACRM-Commercial.ps1",
      "payload/Uninstall-WACRM-Commercial.ps1",
      "payload/WacrmCommercialLauncher.cs",
      "payload/WACRM-Commercial-Suite.sed",
      "payload/wacrm-commercial.ico",
      "android-installer/Install-Android-APK-AutoPermissions-USB.bat",
      "android-installer/README-ANDROID-INSTALL.txt",
    ];
    for (const rel of requiredFiles) {
      const p = path.join(bundleDir, rel);
      expect(fs.existsSync(p), `Missing installer file: ${rel}`).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(20);
    }

    const fixPs = fs.readFileSync(
      path.join(bundleDir, "payload/Fix-WACRM-Hardware-Permissions.ps1"),
      "utf8",
    );
    expect(fixPs).toContain("webcam");
    expect(fixPs).toContain("microphone");
    expect(fixPs).toContain("VideoCaptureAllowedUrls");
    expect(fixPs).toContain("AudioCaptureAllowedUrls");

    // Ensure C# launcher is pure ASCII so Windows .NET 4.0 csc.exe compiles with zero codepage issues
    const csCode = fs.readFileSync(
      path.join(bundleDir, "payload/WacrmCommercialLauncher.cs"),
      "utf8",
    );
    expect(/[^\x00-\x7F]/.test(csCode)).toBe(false);
  });

  it("Gate 5: Publisher HQ Standard EMS — PSAK 72 Double-Entry Balance + Full CRUD Engine", () => {
    const base = buildInitialPublisherState();
    const tb = computeTrialBalance(base.coa, base.journals);
    const bs = computeBalanceSheet(base.coa, base.journals);
    const pl = computeIncomeStatement(base.coa, base.journals);

    expect(tb.balanced).toBe(true);
    expect(bs.balanced).toBe(true);
    expect(pl.totalRevenue).toBeGreaterThan(0);

    // Tenant Update + Delete CRUD verification
    const firstTenant = base.tenants[0];
    const updatedState = updateTenantInState(base, firstTenant.id, {
      companyName: "PT Uji Komersial Nusantara",
      city: "Surabaya",
    });
    expect(updatedState.tenants[0].companyName).toBe("PT Uji Komersial Nusantara");
    expect(updatedState.tenants[0].city).toBe("Surabaya");

    const deletedTenantState = deleteTenantInState(updatedState, firstTenant.id);
    expect(deletedTenantState.tenants.some((t) => t.id === firstTenant.id)).toBe(false);

    // HR Employee Insert + Update + Delete CRUD verification
    const withNewEmp = insertEmployeeInState(base, {
      name: "Nadia Putri",
      role: "sales_ae",
      department: "Enterprise Sales",
      email: "nadia@wacrm.id",
      monthlySalaryIdr: 8_500_000,
      salesTargetMrrIdr: 45_000_000,
      status: "active",
    });
    expect(withNewEmp.employees.length).toBe(base.employees.length + 1);
    const insertedId = withNewEmp.employees[0].id;
    const editedEmp = updateEmployeeInState(withNewEmp, insertedId, {
      monthlySalaryIdr: 9_500_000,
    });
    expect(editedEmp.employees[0].monthlySalaryIdr).toBe(9_500_000);
    const afterDelEmp = deleteEmployeeInState(editedEmp, insertedId);
    expect(afterDelEmp.employees.length).toBe(base.employees.length);
  });

  it("Gate 6: Publisher HQ 5-Agent Multi-Agent AI Hub (Chat 24/7, BANT Scoring & Follow-Up Cadence)", () => {
    const agents = buildDefaultPublisherAiAgents();
    expect(agents).toHaveLength(5);

    const qualified = qualifyWebsiteLead({
      fullName: "Hendra Gunawan",
      companyName: "PT Megah Distribusi Indonesia",
      city: "Surabaya",
      industry: "Distribusi FMCG",
      teamSize: "50+ Staf / Multi-Cabang",
      interestedEdition: "enterprise",
      notes: "Urgent bulan ini butuh 12 cabang, ERP FIFO & akuntansi PSAK.",
    });
    expect(qualified.aiScore).toBeGreaterThanOrEqual(75);
    expect(["enterprise", "sovereign"]).toContain(qualified.aiRecommendedEdition);

    const leadObj = {
      registrationCode: "REG-2026-8888",
      fullName: "Hendra Gunawan",
      companyName: "PT Megah Distribusi Indonesia",
      city: "Surabaya",
      aiRecommendedEdition: qualified.aiRecommendedEdition,
    };

    const h0 = buildFollowUpScript(leadObj, "H+0");
    const h3 = buildFollowUpScript(leadObj, "H+3");
    expect(h0).toContain("Hendra Gunawan");
    expect(h3).toContain("PT Megah Distribusi Indonesia");

    const waLink = buildWhatsappDeepLink("081234567890", h0);
    expect(waLink.startsWith("https://wa.me/6281234567890?text=")).toBe(true);

    const chatPrice = generateMultiAgentChatReply("Berapa harga paket Enterprise AI?", {
      prospectName: "Hendra Gunawan",
      companyName: "PT Megah Distribusi Indonesia",
    });
    expect(chatPrice.agentId).toBe("ai_qualifier");
    expect(chatPrice.reply).toContain("699.000");

    const chatHardware = generateMultiAgentChatReply(
      "Bagaimana cara atasi izin kamera dan mikrofon?",
      { prospectName: "Hendra Gunawan" },
    );
    expect(chatHardware.agentId).toBe("ai_onboarding");
    expect(chatHardware.reply.toLowerCase()).toContain("kamera");
  });

  it("Gate 7: Enterprise Marketing Website — Zero Public Client App Link & Auto-Redirect to Publisher HQ", () => {
    const mktSrcDir = path.join(REPO_ROOT, "apps/marketing-web/src");
    const files = collectFilesRecursive(mktSrcDir, [".ts", ".tsx", ".css"]);
    expect(files.length).toBeGreaterThanOrEqual(6);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      // CRITICAL ACCEPTANCE RULE: NEVER expose wacrm-seven-dusky.vercel.app publicly anywhere in website source!
      expect(
        content.toLowerCase(),
        `Public client URL leak detected in ${path.relative(REPO_ROOT, file)}`,
      ).not.toContain("wacrm-seven-dusky");
    }

    const regPortal = fs.readFileSync(
      path.join(mktSrcDir, "components/registration-portal.tsx"),
      "utf8",
    );
    expect(regPortal).toContain("/api/leads");
    expect(regPortal).toContain("privateAccessUrl");
    expect(regPortal).toContain("publisherPortalUrl");
    expect(regPortal).toContain("window.location.assign");

    const catalog = fs.readFileSync(path.join(mktSrcDir, "lib/enterprise-catalog.ts"), "utf8");
    expect(catalog).toContain("https://wacrm-publisher-hq.vercel.app");
  });

  it("Gate 8: Durable Neon Lead API & CORS Publisher HQ Endpoints Exist", () => {
    const requiredRoutes = [
      "src/lib/publisher-leads-store.ts",
      "src/app/api/publisher/leads/route.ts",
      "apps/publisher-admin/src/app/api/leads/route.ts",
      "apps/publisher-admin/src/app/api/ai-agents/route.ts",
      "apps/marketing-web/src/app/api/health/route.ts",
    ];
    for (const rel of requiredRoutes) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel)), `Missing route: ${rel}`).toBe(true);
    }
    const pubLeadsApi = fs.readFileSync(
      path.join(REPO_ROOT, "apps/publisher-admin/src/app/api/leads/route.ts"),
      "utf8",
    );
    expect(pubLeadsApi).toContain("Access-Control-Allow-Origin");
    expect(pubLeadsApi).toContain("privateAccessUrl");
    expect(pubLeadsApi).toContain("publisherPortalUrl");
  });
});
