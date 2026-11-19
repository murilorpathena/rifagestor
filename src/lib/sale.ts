/** Regras puras do PDV, compartilhadas pela página e pelos testes. */

export interface SaleNumberItem {
  id: string;
  number: number;
  status: string;
}

/** Somente números livres podem entrar em uma venda. */
export function isNumberSelectable(item: SaleNumberItem): boolean {
  return item.status === "available";
}

/** Números que podem ser oferecidos ao vendedor. */
export function selectableNumbers(items: readonly SaleNumberItem[]): SaleNumberItem[] {
  return items.filter(isNumberSelectable);
}

/** Total da venda em centavos. */
export function calculateSaleTotalCents(priceCents: number, quantity: number): number {
  if (!Number.isFinite(priceCents) || !Number.isFinite(quantity)) return 0;
  return Math.max(0, priceCents) * Math.max(0, Math.trunc(quantity));
}

/** Itens selecionados que continuam disponíveis (número pode ter sido vendido em outra aba). */
export function validSelectedNumbers(
  items: readonly SaleNumberItem[],
  selectedIds: ReadonlySet<string>,
): SaleNumberItem[] {
  return items.filter((item) => selectedIds.has(item.id) && isNumberSelectable(item));
}

/** Uma venda só pode ser finalizada com pelo menos um número ainda disponível. */
export function canFinalizeSale(
  items: readonly SaleNumberItem[],
  selectedIds: ReadonlySet<string>,
): boolean {
  return validSelectedNumbers(items, selectedIds).length > 0;
}
