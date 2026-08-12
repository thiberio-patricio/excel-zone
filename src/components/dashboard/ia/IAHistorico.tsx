import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2, RefreshCw, Copy, FileClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";

interface Registro {
  id: string;
  store_id: string | null;
  analysis_date: string;
  analysis_type: string;
  generated_text: string;
  created_at: string;
}

const TIPOS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

export default function IAHistorico() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [lojas, setLojas] = useState<Record<string, string>>({});
  const [tipo, setTipo] = useState("todos");
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    const [hist, filiais] = await Promise.all([
      supabase
        .from("ai_analysis_history")
        .select("id, store_id, analysis_date, analysis_type, generated_text, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("filiais").select("id, nome"),
    ]);
    setRegistros((hist.data ?? []) as Registro[]);
    setLojas(Object.fromEntries((filiais.data ?? []).map((f) => [f.id, f.nome])));
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = registros.filter((r) => tipo === "todos" || r.analysis_type === tipo);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        eyebrow="IA Executiva · ANA"
        title="Histórico de Análises"
        description="Todas as análises geradas pela ANA, com data, tipo, loja e conteúdo completo."
        actions={
          <div className="flex items-center gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={carregar} disabled={carregando}>
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>
        }
      />

      {carregando ? (
        <PageCard>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : filtrados.length === 0 ? (
        <PageCard padded={false}>
          <EmptyState
            icon={FileClock}
            title="Nenhuma análise registrada"
            description="As análises geradas pela ANA aparecem aqui automaticamente."
          />
        </PageCard>
      ) : (
        <div className="space-y-4">
          {filtrados.map((r) => (
            <PageCard key={r.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {r.analysis_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {r.analysis_date.split("-").reverse().join("/")}
                  </span>
                  {r.store_id && lojas[r.store_id] && (
                    <span className="text-xs text-muted-foreground">· {lojas[r.store_id]}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(r.generated_text);
                    toast.success("Análise copiada");
                  }}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {r.generated_text}
              </p>
            </PageCard>
          ))}
        </div>
      )}
    </div>
  );
}
