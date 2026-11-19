// @ts-ignore - Deno/esm.sh module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  sale_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verifica quem está chamando
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !caller) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'gestor') {
      return new Response(JSON.stringify({ error: 'Apenas administradores e gestores podem notificar' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: RequestBody = await req.json();
    const { sale_id } = body;
    if (!sale_id) return new Response(JSON.stringify({ error: 'sale_id é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Busca a venda com dados do comprador
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id, total_cents, payment_status, created_at, comprovante_url, telegram_notified, buyer_id, organization_id')
      .eq('id', sale_id)
      .maybeSingle();

    if (saleError || !sale) return new Response(JSON.stringify({ error: 'Venda não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (sale.telegram_notified) {
      return new Response(JSON.stringify({ success: true, message: 'Venda já foi notificada no Telegram' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!sale.comprovante_url) {
      return new Response(JSON.stringify({ error: 'Venda não possui comprovante anexado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Busca configuração do Telegram
    const { data: config, error: configError } = await supabase
      .from('telegram_config')
      .select('bot_token, chat_id')
      .eq('organization_id', sale.organization_id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Telegram não configurado para esta organização. Peça ao administrador para configurar.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Busca dados do comprador para enriquecer a mensagem (opcional)
    let buyerName = 'Comprador';
    if (sale.buyer_id) {
      const { data: buyer } = await supabase.from('buyers').select('name').eq('id', sale.buyer_id).maybeSingle();
      if (buyer) buyerName = buyer.name;
    }

    // Conta quantidade de números da venda
    const { data: saleNumbers, error: snError } = await supabase
      .from('sale_numbers')
      .select('raffle_number_id')
      .eq('sale_id', sale.id);

    const quantidade = saleNumbers?.length ?? 0;

    // Formata valor
    const valor = (sale.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Formata data
    const dataVenda = new Date(sale.created_at).toLocaleString('pt-BR');

    // Monta mensagem do Telegram
    const texto = `
🧾 *Nova venda registrada*

👤 Comprador: ${buyerName}
🔢 Venda: \`${sale.id}\`
🎫 Quantidade de números: ${quantidade}
💰 Valor total: ${valor}
📅 Data: ${dataVenda}
📎 Comprovante: anexado abaixo
`;

    // Envia foto com legenda para o Telegram
    const telegramResp = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        photo: sale.comprovante_url,
        caption: texto,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResp.json();

    if (!telegramResp.ok || !telegramResult.ok) {
      console.error('Erro Telegram:', telegramResult);
      return new Response(JSON.stringify({ error: 'Falha ao enviar para o Telegram: ' + (telegramResult.description ?? 'erro desconhecido') }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Marca como notificada
    const { error: updateError } = await supabase
      .from('sales')
      .update({ telegram_notified: true })
      .eq('id', sale.id);

    if (updateError) {
      // Não impede o sucesso, mas avisa
      console.error('Erro ao marcar como notificado:', updateError);
    }

    return new Response(JSON.stringify({ success: true, message: 'Notificação enviada ao Telegram com sucesso' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
