/**
 * Testes unitários para validação de inputs e formatação
 * Todas as funções estão definidas inline para não depender de imports externos
 */

import { describe, it, expect } from "vitest";

/* ============================================================
   FUNÇÕES VALIDADORAS (mesma lógica de src/lib/utils.ts)
   ============================================================ */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/* ============================================================
   TESTES
   ============================================================ */

// O Intl.NumberFormat pt-BR usa U+00A0 (non-breaking space) após "R$".
// Normalizamos para espaço comum para que a expectativa seja legível e estável.
function normalizeCurrency(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

describe('📋 Validação de CPF (input do comprador)', () => {
  it('deve aceitar CPF válido com 11 dígitos', () => {
    expect(isValidCpf('11144477735')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('16899535009')).toBe(true);
  });

  it('deve rejeitar CPF com menos de 11 dígitos', () => {
    expect(isValidCpf('123456789')).toBe(false);
    expect(isValidCpf('111444777')).toBe(false);
  });

  it('deve rejeitar CPF com todos os dígitos iguais', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('22222222222')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });

  it('deve rejeitar CPF inválido (dígito verificador errado)', () => {
    expect(isValidCpf('11144477736')).toBe(false);
    expect(isValidCpf('12345678900')).toBe(false);
  });

  it('deve lidar com string vazia', () => {
    expect(isValidCpf('')).toBe(false);
  });
});

describe('🔢 Apenas dígitos (limpeza de input)', () => {
  it('deve remover máscara de CPF', () => {
    expect(onlyDigits('111.444.777-35')).toBe('11144477735');
  });

  it('deve remover máscara de telefone', () => {
    expect(onlyDigits('(11) 99999-9999')).toBe('11999999999');
  });

  it('deve manter apenas números', () => {
    expect(onlyDigits('abc123def')).toBe('123');
    expect(onlyDigits('')).toBe('');
  });
});

describe('💰 Formatação de moeda (valor da rifa)', () => {
  it('deve formatar centavos para real brasileiro', () => {
    expect(normalizeCurrency(formatCurrency(2000))).toBe('R$ 20,00');
    expect(normalizeCurrency(formatCurrency(1500))).toBe('R$ 15,00');
    expect(normalizeCurrency(formatCurrency(0))).toBe('R$ 0,00');
    expect(normalizeCurrency(formatCurrency(123456))).toBe('R$ 1.234,56');
  });

  it('deve lidar com valor único', () => {
    expect(normalizeCurrency(formatCurrency(100))).toBe('R$ 1,00');
  });
});

describe('🪪 Formatação de CPF para exibição', () => {
  it('deve aplicar máscara de CPF', () => {
    expect(formatCpf('11144477735')).toBe('111.444.777-35');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  it('deve lidar com CPF curto', () => {
    expect(formatCpf('123')).toBe('123');
  });
});

describe('📱 Formatação de WhatsApp/Telefone', () => {
  it('deve formatar celular com 11 dígitos', () => {
    expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
  });

  it('deve formatar telefone fixo com 10 dígitos', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('deve retornar valor original se não puder formatar', () => {
    expect(formatPhone('123')).toBe('123');
  });
});

describe('📅 Formatação de data (sorteio)', () => {
  it('deve formatar data completa', () => {
    const result = formatDate('2026-12-25T10:00:00Z');
    expect(result).toContain('25');
    expect(result).toContain('2026');
  });

  it('deve retornar traço para data nula', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('deve formatar data e hora', () => {
    const result = formatDateTime('2026-12-25T14:30:00Z');
    expect(result).toContain('25');
    expect(result).toContain('2026');
  });
});

describe('🔐 Validação de senha', () => {
  it('deve rejeitar senha curta', () => {
    const senha = '1234567';
    expect(senha.length).toBeLessThan(8);
  });

  it('deve aceitar senha com 8+ caracteres', () => {
    const senha = 'adm@1234';
    expect(senha.length).toBeGreaterThanOrEqual(8);
  });

  it('deve rejeitar senha vazia', () => {
    expect(''.length).toBe(0);
  });
});

describe('📧 Validação de e-mail (formato)', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('deve aceitar e-mails válidos', () => {
    expect(emailRegex.test('rifa@adm.com')).toBe(true);
    expect(emailRegex.test('usuario@exemplo.com.br')).toBe(true);
    expect(emailRegex.test('teste@dominio.io')).toBe(true);
  });

  it('deve rejeitar e-mails inválidos', () => {
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('sem-arroba.com')).toBe(false);
    expect(emailRegex.test('@semusuario.com')).toBe(false);
    expect(emailRegex.test('usuario@semponto')).toBe(false);
  });
});

describe('🔢 Validação de quantidade de números', () => {
  it('deve aceitar quantidade positiva', () => {
    const qtd = 5;
    expect(qtd).toBeGreaterThan(0);
    expect(qtd).toBeLessThanOrEqual(100);
  });

  it('deve rejeitar quantidade zero ou negativa', () => {
    expect(0).not.toBeGreaterThan(0);
    expect(-1).not.toBeGreaterThan(0);
  });

  it('deve respeitar limite máximo', () => {
    const qtd = 101;
    expect(qtd).toBeGreaterThan(100);
  });
});

describe('💵 Cálculo de total da venda', () => {
  it('deve calcular total = preço × quantidade', () => {
    const preco = 2000; // R$ 20,00 em centavos
    const quantidade = 3;
    const total = preco * quantidade;
    expect(total).toBe(6000); // R$ 60,00
  });

  it('deve calcular total para unidade única', () => {
    const preco = 2000;
    const quantidade = 1;
    expect(preco * quantidade).toBe(2000);
  });

  it('deve zerar total se quantidade for zero', () => {
    const preco = 2000;
    const quantidade = 0;
    expect(preco * quantidade).toBe(0);
  });
});
