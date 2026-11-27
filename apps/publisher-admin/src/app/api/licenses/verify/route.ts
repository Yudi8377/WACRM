import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySignedLicenseKey } from "@/lib/license-engine";

const VerifySchema = z.object({
  licenseKey: z.string().min(10).max(80),
  tenantId: z.string().max(120).optional(),
  domain: z.string().max(200).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json({
    service: "WACRM Publisher HQ License Verification API",
    publisher: "PT WACRM Digital Nusantara",
    status: "operational",
    protocol: "WACRM-LMS-SIGNED-V1",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, error: "Payload licenseKey tidak valid." },
      { status: 400 },
    );
  }

  const result = verifySignedLicenseKey(parsed.data.licenseKey);
  return NextResponse.json(
    {
      ...result,
      publisher: "PT WACRM Digital Nusantara",
      verifiedAt: new Date().toISOString(),
    },
    { status: result.valid ? 200 : 422 },
  );
}
