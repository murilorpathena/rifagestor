// @ts-ignore - Deno/esm.sh module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore - Deno runtime
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// @ts-ignore - Deno runtime
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'vendedor';
  organization_id?: string;
}

Deno.serve(async (req) => {
  try {
    // Verificar se o usuário logado é admin
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');

    const { data: { user: callerUser }, error: callerError } = await supabase.auth.getUser(jwt);

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Buscar perfil do chamador para verificar se é admin
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.password || !body.full_name || !body.role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, password, full_name, role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Criar usuário via admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        role: body.role,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Criar perfil
    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.id,
        name: body.full_name,
        email: body.email,
        role: body.role,
      });

    if (profileInsertError) {
      // Se falhar o perfil, tenta deletar o usuário criado
      await supabase.auth.admin.deleteUser(newUser.id);
      return new Response(JSON.stringify({ error: profileInsertError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Se for gestor ou vendedor e tiver organization_id, vincular à organização
    if ((body.role === 'gestor' || body.role === 'vendedor') && body.organization_id) {
      const memberRole = body.role === 'gestor' ? 'owner' : 'member';
      await supabase
        .from('organization_members')
        .insert({
          organization_id: body.organization_id,
          user_id: newUser.id,
          role: memberRole,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: body.role,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
