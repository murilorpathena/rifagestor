/**
 * Regras do PDV em código de produção (src/lib/sale.ts).
 * Não há componente simulado: os testes exercitam as mesmas funções usadas pela página /vendas.
 */

import { describe, it, expect } from "vitest";
import {
  calculateSaleTotalCents,
  canFinalizeSale,
  isNumberSelectable,
  selectableNumbers,
  validSelectedNumbers,
  type SaleNumberItem,
} from "@/lib/sale";

const numbers: SaleNumberItem[] = [
  { id: "n1", number: 1, status: "available" },
  { id: "n2", number: 2, status: "available" },
  { id: "n3", number: 3, status: "available" },
  { id: "n4", number: 4, status: "sold" },
  { id: "n5", number: 5, status: "reserved" },
];

describe("Seleção de números (src/lib/sale.ts)", () => {
  it("só números livres podem ser selecionados", () => {
    expect(isNumberSelectable(numbers[0])).toBe(true);
    expect(isNumberSelectable(numbers[3])).toBe(false);
    expect(isNumberSelectable(numbers[4])).toBe(false);
    expect(selectableNumbers(numbers).map((n) => n.number)).toEqual([1, 2, 3]);
  });

  it("ignora números vendidos ou reservados que estejam na seleção", () => {
    const selected = new Set(["n1", "n4", "n5"]);
    expect(validSelectedNumbers(numbers, selected).map((n) => n.number)).toEqual([1]);
  });

  it("não permite finalizar sem nenhum número disponível", () => {
    expect(canFinalizeSale(numbers, new Set())).toBe(false);
    expect(canFinalizeSale(numbers, new Set(["n4", "n5"]))).toBe(false);
    expect(canFinalizeSale(numbers, new Set(["n2"]))).toBe(true);
  });
});

describe("Cálculo do total da venda", () => {
  it("multiplica preço por quantidade", () => {
    expect(calculateSaleTotalCents(2000, 3)).toBe(6000);
    expect(calculateSaleTotalCents(1000, 1)).toBe(1000);
  });

  it("nunca retorna valor negativo", () => {
    expect(calculateSaleTotalCents(2000, 0)).toBe(0);
    expect(calculateSaleTotalCents(2000, -2)).toBe(0);
    expect(calculateSaleTotalCents(-100, 2)).toBe(0);
  });

  it("arredonda quantidades fracionárias para baixo", () => {
    expect(calculateSaleTotalCents(1000, 2.9)).toBe(2000);
  });

  it("retorna zero para entradas inválidas", () => {
    expect(calculateSaleTotalCents(Number.NaN, 2)).toBe(0);
    expect(calculateSaleTotalCents(1000, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
