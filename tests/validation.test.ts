/**
 * Testes das funções de validação e formatação realmente usadas pelo app.
 * Todos os imports vêm de src/, então uma mudança no production code quebra estes testes.
 */

import { describe, it, expect } from "vitest";
import {
  formatCpf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  initials,
  isValidCpf,
  onlyDigits,
  slugify,
} from "@/lib/utils";
import {
  buyerSchema,
  emailSchema,
  getZodMessage,
  passwordSchema,
  saleSchema,
} from "@/lib/validation";

function normalizeCurrency(value: string): string {
  return value.replace(/\u00a0/g, " ");
}

describe("Validação de CPF (src/lib/utils.ts)", () => {
  it("aceita CPFs válidos com 11 dígitos", () => {
    expect(isValidCpf("11144477735")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("16899535009")).toBe(true);
  });

  it("rejeita CPF curto, dígitos repetidos e verificador errado", () => {
    expect(isValidCpf("123456789")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("11144477736")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});

describe("Limpeza e formatação de inputs", () => {
  it("onlyDigits remove máscaras", () => {
    expect(onlyDigits("111.444.777-35")).toBe("11144477735");
    expect(onlyDigits("(11) 99999-9999")).toBe("11999999999");
    expect(onlyDigits("abc123def")).toBe("123");
  });

  it("formatCurrency converte centavos para BRL", () => {
    expect(normalizeCurrency(formatCurrency(2000))).toBe("R$ 20,00");
    expect(normalizeCurrency(formatCurrency(123456))).toBe("R$ 1.234,56");
    expect(normalizeCurrency(formatCurrency(0))).toBe("R$ 0,00");
  });

  it("formatCpf aplica a máscara", () => {
    expect(formatCpf("11144477735")).toBe("111.444.777-35");
    expect(formatCpf("123")).toBe("123");
  });

  it("formatPhone trata celular e fixo", () => {
    expect(formatPhone("11999999999")).toBe("(11) 99999-9999");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatPhone("123")).toBe("123");
  });

  it("formatDate e formatDateTime retornam traço para valores vazios", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
    expect(formatDate("2026-12-25T10:00:00Z")).toContain("2026");
    expect(formatDateTime("2026-12-25T14:30:00Z")).toContain("25");
  });

  it("initials e slugify funcionam com acentos", () => {
    expect(initials("Maria da Silva")).toBe("MD");
    expect(slugify("Rifa da Amiga")).toBe("rifa-da-amiga");
  });
});

describe("Schemas reais (src/lib/validation.ts)", () => {
  it("emailSchema aceita e rejeita e-mails", () => {
    expect(emailSchema.safeParse("rifa@adm.com").success).toBe(true);
    expect(emailSchema.safeParse("sem-arroba.com").success).toBe(false);
    expect(emailSchema.safeParse("@semusuario.com").success).toBe(false);
  });

  it("passwordSchema respeita 8 a 72 caracteres", () => {
    expect(passwordSchema.safeParse("adm@1234").success).toBe(true);
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("".padEnd(73, "a")).success).toBe(false);
  });

  it("buyerSchema valida CPF e WhatsApp e normaliza os dígitos", () => {
    const valid = buyerSchema.parse({
      name: "Comprador QA",
      cpf: "111.444.777-35",
      email: "",
      whatsapp: "(11) 99999-9999",
    });
    expect(valid.cpf).toBe("11144477735");
    expect(valid.whatsapp).toBe("11999999999");

    const invalid = buyerSchema.safeParse({
      name: "Comprador QA",
      cpf: "111.444.777-36",
      email: "",
      whatsapp: "11999999999",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(getZodMessage(invalid.error)).toContain("CPF");
  });

  it("saleSchema aceita pagamento manual e rejeita status inválido", () => {
    const base = {
      buyer: {
        name: "Comprador QA",
        cpf: "52998224725",
        email: "",
        whatsapp: "11999999999",
      },
      quantity: 2,
      payment_method: "pix",
      payment_status: "paid",
    };
    expect(saleSchema.safeParse(base).success).toBe(true);
    expect(
      saleSchema.safeParse({ ...base, payment_method: "boleto" }).success,
    ).toBe(false);
    expect(
      saleSchema.safeParse({ ...base, payment_status: "refunded" }).success,
    ).toBe(false);
    expect(saleSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
  });
});
