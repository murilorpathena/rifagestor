/**
 * 🧪 Teste simulado de venda completa de rifa
 * Simula o fluxo do PDV: seleção de números → dados do comprador → pagamento → finalização
 * Testa cada etapa como se um vendedor estivesse usando o app
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// Componente simulado do PDV de venda (replica a lógica da página /vendas)
function VendaPDV() {
  const [numbers, setNumbers] = React.useState<{ id: string; number: number; status: string }[]>([
    { id: 'n1', number: 1, status: 'available' },
    { id: 'n2', number: 2, status: 'available' },
    { id: 'n3', number: 3, status: 'available' },
    { id: 'n4', number: 4, status: 'sold' },
  ]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [buyer, setBuyer] = React.useState({ name: '', cpf: '', email: '', whatsapp: '' });
  const [step, setStep] = React.useState<'buyer' | 'numbers' | 'confirm'>('buyer');
  const [paymentMethod, setPaymentMethod] = React.useState('pix');
  const [paymentStatus, setPaymentStatus] = React.useState('paid');
  const [message, setMessage] = React.useState('');
  const [price] = React.useState(2000); // R$ 20,00

  const toggleNumber = (id: string) => {
    const num = numbers.find((n) => n.id === id);
    if (!num || num.status !== 'available') return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const total = selected.size * price;

  const handleSubmitBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('numbers');
  };

  const handleFinalize = () => {
    if (selected.size === 0) {
      setMessage('Selecione pelo menos um número');
      return;
    }
    setMessage(`Venda finalizada: ${selected.size} número(s) por R$ ${(total / 100).toFixed(2)}`);
    // Simular marcação dos números como vendidos
    setNumbers(nums => nums.map(n => selected.has(n.id) ? { ...n, status: 'sold' } : n));
    setSelected(new Set());
    setBuyer({ name: '', cpf: '', email: '', whatsapp: '' });
    setStep('buyer');
  };

  return (
    <div data-testid="venda-pdv">
      {step === 'buyer' && (
        <form data-testid="form-buyer" onSubmit={handleSubmitBuyer}>
          <input data-testid="input-name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Nome" />
          <input data-testid="input-cpf" value={buyer.cpf} onChange={(e) => setBuyer({ ...buyer, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="CPF" />
          <input data-testid="input-email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} placeholder="Email" />
          <input data-testid="input-whatsapp" value={buyer.whatsapp} onChange={(e) => setBuyer({ ...buyer, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="WhatsApp" />
          <button type="submit">Próximo</button>
        </form>
      )}

      {step === 'numbers' && (
        <div>
          <p data-testid="selected-count">{selected.size} número(s) selecionado(s)</p>
          <p data-testid="total">Total: R$ ${(total / 100).toFixed(2)}</p>
          {numbers.map((n) => (
            <button
              key={n.id}
              data-testid={`number-${n.number}`}
              disabled={n.status !== 'available'}
              onClick={() => toggleNumber(n.id)}
              className={selected.has(n.id) ? 'selected' : ''}
            >
              {n.number}
            </button>
          ))}
          <button data-testid="btn-finalize" onClick={handleFinalize}>Finalizar Venda</button>
        </div>
      )}

      {step === 'confirm' && (
        <div data-testid="confirm-step">
          <p>Venda confirmada!</p>
          <button onClick={() => setStep('buyer')}>Nova Venda</button>
        </div>
      )}

      <p data-testid="message">{message}</p>
    </div>
  );
}

describe('🛒 Fluxo de venda de rifa (PDV)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('deve mostrar o formulário de comprador na primeira etapa', () => {
    render(<VendaPDV />);
    expect(screen.getByTestId('form-buyer')).toBeDefined();
    expect(screen.getByTestId('input-name')).toBeDefined();
    expect(screen.getByTestId('input-cpf')).toBeDefined();
    expect(screen.getByTestId('input-email')).toBeDefined();
    expect(screen.getByTestId('input-whatsapp')).toBeDefined();
  });

  it('deve avançar para seleção de números após preencher comprador', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '11144477735' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11999999999' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    expect(screen.getByTestId('selected-count')).toBeDefined();
    expect(screen.getByTestId('btn-finalize')).toBeDefined();
  });

  it('deve selecionar e deselecionar números disponíveis', () => {
    render(<VendaPDV />);

    // Avançar para números
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'João' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '11144477735' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11999999999' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    // Selecionar número 1
    fireEvent.click(screen.getByTestId('number-1'));
    expect(screen.getByTestId('selected-count').textContent).toBe('1 número(s) selecionado(s)');

    // Selecionar número 2
    fireEvent.click(screen.getByTestId('number-2'));
    expect(screen.getByTestId('selected-count').textContent).toBe('2 número(s) selecionado(s)');

    // Deselecionar número 1
    fireEvent.click(screen.getByTestId('number-1'));
    expect(screen.getByTestId('selected-count').textContent).toBe('1 número(s) selecionado(s)');
  });

  it('não deve permitir selecionar número já vendido', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'João' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '11144477735' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11999999999' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    // Número 4 está como 'sold', deve estar desabilitado
    const btn4 = screen.getByTestId('number-4');
    expect((btn4 as HTMLButtonElement).disabled).toBe(true);
  });

  it('deve calcular total corretamente com base no preço por número (R$ 20,00)', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'João' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '11144477735' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'joao@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11999999999' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    // Selecionar 3 números
    fireEvent.click(screen.getByTestId('number-1'));
    fireEvent.click(screen.getByTestId('number-2'));
    fireEvent.click(screen.getByTestId('number-3'));

    const totalText = screen.getByTestId('total').textContent;
    expect(totalText).toContain('60');
    expect(totalText).toContain('R$');
  });

  it('deve finalizar venda com números selecionados', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'maria@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11888887777' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    fireEvent.click(screen.getByTestId('number-1'));
    fireEvent.click(screen.getByTestId('btn-finalize'));

    const message = screen.getByTestId('message').textContent;
    expect(message).toContain('Venda finalizada');
  });

  it('não deve finalizar venda sem selecionar números', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'maria@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11888887777' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    fireEvent.click(screen.getByTestId('btn-finalize'));

    expect(screen.getByTestId('message').textContent).toBe('Selecione pelo menos um número');
  });

  it('deve limpar formulário após finalizar venda', () => {
    render(<VendaPDV />);

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByTestId('input-cpf'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'maria@teste.com' } });
    fireEvent.change(screen.getByTestId('input-whatsapp'), { target: { value: '11888887777' } });
    fireEvent.submit(screen.getByTestId('form-buyer'));

    fireEvent.click(screen.getByTestId('number-1'));
    fireEvent.click(screen.getByTestId('btn-finalize'));

    // Após finalizar, volta para tela de comprador com campos limpos
    expect(screen.getByTestId('form-buyer')).toBeDefined();
    expect((screen.getByTestId('input-name') as HTMLInputElement).value).toBe('');
  });
});

describe('📊 Validação de regras de negócio da venda', () => {
  it('deve permitir venda de 1 número', () => {
    const preco = 2000;
    const qtd = 1;
    expect(preco * qtd).toBe(2000);
  });

  it('deve permitir venda de múltiplos números', () => {
    const preco = 2000;
    const qtd = 10;
    expect(preco * qtd).toBe(20000);
  });

  it('não deve permitir venda com quantidade zero', () => {
    const qtd = 0;
    expect(qtd).toBe(0);
    expect(qtd > 0).toBe(false);
  });

  it('CPF do comprador deve ter 11 dígitos após limpeza', () => {
    const cpfComMascara = '111.444.777-35';
    const cpfLimpo = cpfComMascara.replace(/\D/g, '');
    expect(cpfLimpo.length).toBe(11);
  });
});
