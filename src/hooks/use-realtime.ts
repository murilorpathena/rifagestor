"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeChange {
  table: string;
  event: RealtimeEvent;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

/**
 * Assina mudancas do Postgres (Supabase Realtime) nas tabelas informadas.
 *
 * O RLS e respeitado pelo Realtime: o usuario so recebe eventos das linhas
 * que ele ja consegue ler. O callback recebe o nome da tabela afetada para
 * que a tela recarregue apenas o que mudou.
 *
 * @param tables  tabelas em `public` (ex.: ["sales", "raffle_numbers"])
 * @param onChange callback disparado a cada evento recebido
 * @param enabled permite desligar a assinatura (ex.: enquanto o usuario esta logando)
 */
export function useRealtime(
  tables: string[],
  onChange: (change: RealtimeChange) => void,
  enabled = true,
) {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  // Identificador unico por instancia do hook (evita colisao de topico entre telas).
  const instanceId = useRef(Math.random().toString(36).slice(2, 10));

  const tableKey = tables.join(",");

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const list = tableKey ? tableKey.split(",") : [];
    if (list.length === 0) return;

    const channel: RealtimeChannel = supabase.channel(
      `rifa:${instanceId.current}:${list.join("-")}`,
    );

    for (const table of list) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          handlerRef.current({
            table,
            event: payload.eventType as RealtimeEvent,
            new: (payload.new ?? {}) as Record<string, unknown>,
            old: (payload.old ?? {}) as Record<string, unknown>,
          });
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tableKey, enabled]);
}

/**
 * Atalho para o padrao mais comum: recarregar os dados quando qualquer das
 * tabelas mudar.
 */
export function useRealtimeRefresh(
  tables: string[],
  refresh: () => void | Promise<void>,
  enabled = true,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useRealtime(
    tables,
    () => {
      void refreshRef.current();
    },
    enabled,
  );
}
