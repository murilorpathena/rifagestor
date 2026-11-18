-- Corrige o trigger para não falhar se algo der erro na criação automática de organização/rifa
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_user uuid := new.id;
  v_meta jsonb := new.raw_user_meta_data;
  v_org uuid;
  v_raffle uuid;
  v_slug text;
  v_price integer := 2000;
  v_total integer := 100;
  v_default_qty integer := 1;
  i integer;
begin
  -- Cria o perfil (sempre)
  begin
    insert into profiles (id, name, email)
    values (v_user, coalesce((v_meta->>'full_name')::text, new.email), new.email);
  exception when others then end;

  -- Se veio de convite, aceita automaticamente
  if v_meta ? 'invitation_token' then
    begin
      declare
        v_invitation record;
      begin
        select * into v_invitation from invitations where token = (v_meta->>'invitation_token')::uuid and status = 'pending';
        if found and v_invitation.expires_at > now() and lower(v_invitation.email) = lower(new.email) then
          insert into organization_members (organization_id, user_id, role)
          values (v_invitation.organization_id, v_user, v_invitation.role)
          on conflict do nothing;

          update invitations
          set status = 'accepted', accepted_by = v_user, accepted_at = now()
          where token = v_invitation.token;
        end if;
      end;
    end;
    return new;
  end if;

  -- Caso contrário, cria organização e rifa próprias (com tratamento de erro)
  begin
    v_slug := lower(regexp_replace(coalesce(v_meta->>'organization_name', 'minha-rifa'), '[^a-z0-9]+', '-', 'g'));

    insert into organizations (name, slug)
    values (coalesce(v_meta->>'organization_name', 'Minha Rifa'), v_slug)
    returning id into v_org;

    insert into organization_members (organization_id, user_id, role)
    values (v_org, v_user, 'owner');

    v_price := coalesce((v_meta->>'ticket_price_cents')::integer, 2000);
    v_total := coalesce((v_meta->>'total_numbers')::integer, 100);
    v_default_qty := coalesce((v_meta->>'default_numbers_per_sale')::integer, 1);

    insert into raffles (organization_id, title, description, prize, ticket_price_cents,
                         total_numbers, default_numbers_per_sale, created_by)
    values (v_org, coalesce(v_meta->>'raffle_title', 'Minha Rifa'),
            'Rifa criada automaticamente no cadastro.', null, v_price, v_total, v_default_qty, v_user)
    returning id into v_raffle;

    for i in 1..v_total loop
      insert into raffle_numbers (raffle_id, number, status)
      values (v_raffle, i, 'available');
    end loop;
  exception when others then
    -- Se algo falhar, pelo menos o usuário e perfil já foram criados acima
  end;

  return new;
end;
$$;
