import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Loader2, Save, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { useIASettings } from "./useIASettings";

interface Assistente {
  id: string;
  assistant_name: string;
  assistant_photo: string | null;
  assistant_role: string;
  tone: string;
  active: boolean;
}

const TONS = [
  { value: "profissional", label: "Profissional" },
  { value: "consultivo", label: "Consultivo" },
  { value: "objetivo", label: "Objetivo e direto" },
  { value: "motivacional", label: "Motivacional" },
];

export default function IAConfiguracoes() {
  const { settings, carregando: carregandoSettings, atualizar } = useIASettings();
  const [assistente, setAssistente] = useState<Assistente | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarAssistente = async () => {
    const { data } = await supabase
      .from("ai_assistants")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAssistente(data as Assistente);
      return;
    }
    const { data: criado, error } = await supabase
      .from("ai_assistants")
      .insert({})
      .select("*")
      .single();
    if (error) toast.error("Não foi possível iniciar a assistente");
    else setAssistente(criado as Assistente);
  };

  useEffect(() => {
    carregarAssistente();
  }, []);

  const salvarAssistente = async () => {
    if (!assistente) return;
    setSalvando(true);
    const { error } = await supabase
      .from("ai_assistants")
      .update({
        assistant_name: assistente.assistant_name,
        assistant_photo: assistente.assistant_photo,
        assistant_role: assistente.assistant_role,
        tone: assistente.tone,
        active: assistente.active,
      })
      .eq("id", assistente.id);
    setSalvando(false);
    if (error) toast.error("Não foi possível salvar a assistente");
    else toast.success("Identidade da assistente atualizada");
  };

  const relatorios = [
    { key: "daily_report_enabled" as const, label: "Relatório diário", desc: "Resumo operacional do dia" },
    { key: "weekly_report_enabled" as const, label: "Relatório semanal", desc: "Consolidado dos últimos 7 dias" },
    { key: "monthly_report_enabled" as const, label: "Relatório mensal", desc: "Fechamento do mês" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        eyebrow="IA Executiva · ANA"
        title="Configurações"
        description="Defina a identidade da assistente virtual, o tom de comunicação e quais relatórios estarão ativos."
      />

      <PageCard>
        <div className="mb-5 flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">Identidade da assistente</h3>
        </div>

        {!assistente ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da assistente</Label>
                <Input
                  value={assistente.assistant_name}
                  onChange={(e) => setAssistente({ ...assistente, assistant_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={assistente.assistant_role}
                  onChange={(e) => setAssistente({ ...assistente, assistant_role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Foto (URL)</Label>
                <Input
                  value={assistente.assistant_photo ?? ""}
                  placeholder="https://..."
                  onChange={(e) => setAssistente({ ...assistente, assistant_photo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tom de comunicação</Label>
                <Select
                  value={assistente.tone}
                  onValueChange={(v) => setAssistente({ ...assistente, tone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-card border border-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Assistente ativa</p>
                <p className="text-xs text-muted-foreground">
                  Quando desativada, nenhuma análise automática é gerada.
                </p>
              </div>
              <Switch
                checked={assistente.active}
                onCheckedChange={(v) => setAssistente({ ...assistente, active: v })}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={salvarAssistente} disabled={salvando}>
                {salvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </PageCard>

      <PageCard>
        <h3 className="mb-1 font-display text-base font-semibold text-foreground">Relatórios ativos</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Controle quais análises a ANA prepara automaticamente.
        </p>

        {carregandoSettings || !settings ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {relatorios.map((r) => (
              <div
                key={r.key}
                className="flex items-center justify-between rounded-card border border-white/5 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
                <Switch
                  checked={settings[r.key]}
                  onCheckedChange={(v) => atualizar({ [r.key]: v })}
                />
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  );
}
