// @ts-ignore - Deno/esm.sh module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore - Deno runtime
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore - Deno runtime
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'admin' | 'gestor' | 'vendedor';

interface RequestBody {
  action?: 'create' | 'delete' | 'update_password';
  user_id?: string;
  password?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  organization_id?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Não autorizado' }, 401);

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !caller) return json({ error: 'Não autorizado' }, 401);

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    const callerRole = callerProfile?.role;
    if (callerRole !== 'admin' && callerRole !== 'gestor') {
      return json({ error: 'Apenas administradores e gestores podem gerenciar usuários' }, 403);
    }

    const { data: callerMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', caller.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const body: RequestBody = await req.json();
    const action = body.action ?? 'create';

    // ------------------------------------------------------------------ delete
    if (action === 'delete') {
      if (callerRole !== 'admin') return json({ error: 'Apenas o administrador pode remover contas' }, 403);
      if (!body.user_id) return json({ error: 'user_id é obrigatório' }, 400);
      if (body.user_id === caller.id) return json({ error: 'Você não pode remover sua própria conta' }, 400);

      const { error } = await supabase.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // --------------------------------------------------------- update_password
    if (action === 'update_password') {
      if (callerRole !== 'admin') return json({ error: 'Apenas o administrador pode redefinir senhas' }, 403);
      if (!body.user_id || !body.password || body.password.length < 6) {
        return json({ error: 'user_id e senha (mínimo 6 caracteres) são obrigatórios' }, 400);
      }

      const { error } = await supabase.auth.admin.updateUserById(body.user_id, {
        password: body.password,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ------------------------------------------------------------------ create
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return json({ error: 'Campos obrigatórios: email, password, full_name, role' }, 400);
    }
    if (body.password.length < 6) return json({ error: 'A senha deve ter no mínimo 6 caracteres' }, 400);
    if (!['admin', 'gestor', 'vendedor'].includes(body.role)) {
      return json({ error: 'Função inválida' }, 400);
    }

    // Gestor só pode criar vendedores dentro da própria organização.
    let role: UserRole = body.role;
    let organizationId = body.organization_id ?? callerMember?.organization_id ?? null;
    if (callerRole === 'gestor') {
      role = 'vendedor';
      organizationId = callerMember?.organization_id ?? null;
      if (!organizationId) return json({ error: 'Gestor sem organização vinculada' }, 400);
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, role },
    });

    if (createError) return json({ error: createError.message }, 400);

    // O trigger handle_new_user já cria o profile; o upsert cobre ambos os casos.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: created.user.id, name: body.full_name, email: body.email, role },
        { onConflict: 'id' },
      );

    if (profileError) {
      await supabase.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }

    if (role !== 'admin' && organizationId) {
      const { error: memberError } = await supabase
        .from('organization_members')
        .upsert(
          {
            organization_id: organizationId,
            user_id: created.user.id,
            role: role === 'gestor' ? 'owner' : 'member',
          },
          { onConflict: 'organization_id,user_id' },
        );

      if (memberError) {
        return json({
          success: true,
          warning: `Usuário criado, mas não foi possível vincular à rifa: ${memberError.message}`,
          user: { id: created.user.id, email: created.user.email, role },
        });
      }
    }

    return json({
      success: true,
      user: { id: created.user.id, email: created.user.email, role },
    });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Erro interno' }, 500);
  }
});
