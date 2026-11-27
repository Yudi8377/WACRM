import { describe, expect, it } from "vitest";
import {
  buildJournalEntry,
  computeBalanceSheet,
  computeCashFlowStatement,
  computeIncomeStatement,
  computeTaxSummary,
  computeTrialBalance,
} from "./accounting-engine";
import { issueSignedLicenseKey, verifySignedLicenseKey } from "./license-engine";
import {
  buildInitialPublisherState,
  computePublisherOverview,
  convertDealToClosedWonInState,
  issueLicenseInState,
  markInvoicePaidInState,
  mutateLicenseInState,
  payVendorPoInState,
  runMonthlyRevenueRecognitionInState,
} from "./publisher-store";

describe("WACRM Publisher HQ — Standalone Super Admin Enterprise Management System", () => {
  it("initializes with 100% balanced PSAK Trial Balance, Balance Sheet, and reconciled Cash Flow", () => {
    const state = buildInitialPublisherState();
    const tb = computeTrialBalance(state.coa, state.journals);
    const bs = computeBalanceSheet(state.coa, state.journals);
    const cf = computeCashFlowStatement(state.journals);
    const pl = computeIncomeStatement(state.coa, state.journals);
    const tax = computeTaxSummary(state.coa, state.journals, state.invoices);

    expect(tb.balanced).toBe(true);
    expect(tb.sumEndingDebit).toBe(tb.sumEndingCredit);
    expect(bs.balanced).toBe(true);
    expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);
    expect(cf.endingCashBalance).toBe(bs.cashAndBankBalance);
    expect(bs.deferredRevenueBalance).toBeGreaterThan(0);
    expect(pl.totalRevenue).toBeGreaterThan(0);
    expect(tax.ppnOutputIdr).toBeGreaterThan(tax.ppnInputIdr);
  });

  it("issues, verifies, renews, upgrades, and rejects tampered cryptographic license keys", () => {
    const key = issueSignedLicenseKey({
      editionId: "sovereign",
      expiryYear: 2028,
      expiryMonth: 11,
      maxSeats: 9999,
    });
    const verified = verifySignedLicenseKey(key, new Date("2026-11-26T00:00:00Z"));
    expect(verified.valid).toBe(true);
    expect(verified.editionId).toBe("sovereign");
    expect(verified.isUnlimitedSeats).toBe(true);

    const tampered = key.replace("SOV", "ENT");
    expect(verifySignedLicenseKey(tampered, new Date("2026-11-26T00:00:00Z")).valid).toBe(false);

    const base = buildInitialPublisherState();
    const issued = issueLicenseInState(base, {
      tenantId: base.tenants[0].id,
      editionId: "enterprise",
      billingCycle: "annual",
      maxSeats: 60,
      expiryYear: 2028,
      expiryMonth: 6,
    });
    expect(issued.license.licenseKey).toMatch(/^WACRM-ENT-2806-0060-[0-9A-F]{8}$/);
    expect(issued.state.licenses.length).toBe(base.licenses.length + 1);

    const upgraded = mutateLicenseInState(
      issued.state,
      issued.license.id,
      "upgrade",
      "sovereign",
    );
    const upLic = upgraded.licenses.find((l) => l.id === issued.license.id)!;
    expect(upLic.editionId).toBe("sovereign");
    expect(verifySignedLicenseKey(upLic.licenseKey, new Date("2026-11-26T00:00:00Z")).valid).toBe(
      true,
    );
  });

  it("executes end-to-end CRM Close Won → New Tenant + Signed License + Invoice + Balanced PSAK Journal", () => {
    const base = buildInitialPublisherState();
    const deal = base.deals[0]; // PT Sinar Logistik Express (Sovereign Annual, Rp 59.9jt + 15% reseller)
    const bsBefore = computeBalanceSheet(base.coa, base.journals);

    const converted = convertDealToClosedWonInState(base, deal.id);
    const next = converted.state;

    expect(converted.invoice.status).toBe("paid");
    expect(converted.invoice.ppnAmountIdr).toBe(Math.round(deal.dealValueIdr * 0.11));
    expect(
      verifySignedLicenseKey(converted.license.licenseKey, new Date("2026-11-26T00:00:00Z")).valid,
    ).toBe(true);

    const bsAfter = computeBalanceSheet(next.coa, next.journals);
    const tbAfter = computeTrialBalance(next.coa, next.journals);
    expect(tbAfter.balanced).toBe(true);
    expect(bsAfter.balanced).toBe(true);
    expect(bsAfter.cashAndBankBalance).toBe(
      bsBefore.cashAndBankBalance + converted.invoice.totalIdr,
    );
    expect(bsAfter.deferredRevenueBalance).toBe(
      bsBefore.deferredRevenueBalance + deal.dealValueIdr,
    );
  });

  it("amortizes Deferred SaaS Revenue (PSAK 72) and pays Hardware Vendor PO with stock update + balanced ledger", () => {
    const base = buildInitialPublisherState();
    const plBefore = computeIncomeStatement(base.coa, base.journals);
    const bsBefore = computeBalanceSheet(base.coa, base.journals);

    // 1. Run Monthly Deferred Revenue Recognition
    const afterRevRec = runMonthlyRevenueRecognitionInState(base, 5_000_000, "Desember 2026");
    const plAfter = computeIncomeStatement(afterRevRec.coa, afterRevRec.journals);
    const bsAfterRevRec = computeBalanceSheet(afterRevRec.coa, afterRevRec.journals);

    expect(plAfter.totalRevenue).toBe(plBefore.totalRevenue + 5_000_000);
    expect(bsAfterRevRec.deferredRevenueBalance).toBe(bsBefore.deferredRevenueBalance - 5_000_000);
    expect(bsAfterRevRec.balanced).toBe(true);

    // 2. Pay Overdue Invoice & Pay Hardware PO
    const overdueInv = afterRevRec.invoices.find((i) => i.status === "overdue")!;
    const afterPayInv = markInvoicePaidInState(afterRevRec, overdueInv.id);

    const hwSkuBefore = afterPayInv.skus.find((s) => s.sku === "HW-PRN-80")!.stockQty;
    const openHwPo = afterPayInv.purchaseOrders.find((p) => p.status === "ordered")!;
    const afterPayPo = payVendorPoInState(afterPayInv, openHwPo.id);
    const hwSkuAfter = afterPayPo.skus.find((s) => s.sku === "HW-PRN-80")!.stockQty;

    expect(hwSkuAfter).toBe(hwSkuBefore + openHwPo.qty);
    const finalOverview = computePublisherOverview(afterPayPo);
    expect(finalOverview.ledgerBalanced).toBe(true);
    expect(finalOverview.balanceSheetBalanced).toBe(true);
  });

  it("rejects unbalanced double-entry journals strictly", () => {
    const base = buildInitialPublisherState();
    expect(() =>
      buildJournalEntry({
        id: "jrn-bad",
        journalNumber: "JRN-BAD",
        date: "2026-11-26",
        reference: "BAD",
        description: "Unbalanced",
        sourceModule: "manual",
        postedBy: "Tester",
        coa: base.coa,
        rawLines: [
          { accountCode: "1101", debit: 1_000_000, credit: 0 },
          { accountCode: "4101", debit: 0, credit: 900_000 },
        ],
      }),
    ).toThrow(/tidak seimbang/i);
  });
});
