import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IASettings {
  id: string;
  daily_report_enabled: boolean;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  sales_drop_alert: boolean;
  goal_risk_alert: boolean;
  ticket_average_alert: boolean;
  conversion_alert: boolean;
  stock_alert: boolean;
  ranking_alert: boolean;
  send_time: string;
  active: boolean;
  weekly_weekday: number;
  monthly_day: number;
  timezone: string;
  last_daily_run_at: string | null;
  last_weekly_run_at: string | null;
  last_monthly_run_at: string | null;
}

export function useIASettings() {
  const [settings, setSettings] = useState<IASettings | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("ai_notification_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Não foi possível carregar as configurações");
      setCarregando(false);
      return;
    }

    if (data) {
      setSettings(data as IASettings);
      setCarregando(false);
      return;
    }

    const { data: criado, error: insertError } = await supabase
      .from("ai_notification_settings")
      .insert({})
      .select("*")
      .single();

    if (insertError) toast.error("Não foi possível iniciar as configurações");
    else setSettings(criado as IASettings);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizar = useCallback(
    async (patch: Partial<IASettings>) => {
      if (!settings) return;
      const anterior = settings;
      setSettings({ ...settings, ...patch });
      setSalvando(true);
      const { error } = await supabase
        .from("ai_notification_settings")
        .update(patch)
        .eq("id", settings.id);
      setSalvando(false);
      if (error) {
        setSettings(anterior);
        toast.error("Não foi possível salvar a alteração");
      }
    },
    [settings]
  );

  return { settings, carregando, salvando, atualizar, recarregar: carregar };
}
