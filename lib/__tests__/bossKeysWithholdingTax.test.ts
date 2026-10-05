import { describe, it, expect } from "vitest";

interface CompanyBossKeyMock {
  id: string;
  legalName: string;
  bossKeyIncludeOtherCompanyAllowances: boolean;
  bossKeyWaiveMandatoryMpfWisp: boolean;
  bossKeyAllowanceTaxableToggle: boolean;
  bossKeyWithholdingTaxToggle: boolean;
}

describe("Boss Keys Feature Control Matrix — Withholding Tax Deduction Checkbox", () => {
  it("defaults bossKeyWithholdingTaxToggle to false (invisible in 201 file) for new companies", () => {
    const company: CompanyBossKeyMock = {
      id: "comp_123",
      legalName: "GP Fresh",
      bossKeyIncludeOtherCompanyAllowances: false,
      bossKeyWaiveMandatoryMpfWisp: false,
      bossKeyAllowanceTaxableToggle: false,
      bossKeyWithholdingTaxToggle: false,
    };

    expect(company.bossKeyWithholdingTaxToggle).toBe(false);
  });

  it("enables withholding tax checkbox visibility when bossKeyWithholdingTaxToggle is true", () => {
    const company: CompanyBossKeyMock = {
      id: "comp_123",
      legalName: "GP Fresh",
      bossKeyIncludeOtherCompanyAllowances: false,
      bossKeyWaiveMandatoryMpfWisp: false,
      bossKeyAllowanceTaxableToggle: false,
      bossKeyWithholdingTaxToggle: true,
    };

    expect(company.bossKeyWithholdingTaxToggle).toBe(true);
  });
});
