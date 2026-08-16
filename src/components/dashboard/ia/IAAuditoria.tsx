import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface LogTentativa {
  id: string;
  attempt: number;
  status: string;
  http_status: number | null;
  error: string | null;
  executed_at: string;
}

interface Envio {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  kind: string;
  message: string | null;
  media_url: string | null;
  media_filename: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  provider: string | null;
  sent_at: string | null;
  created_at: string;
  whatsapp_logs: LogTentativa[];
}

const STATUS = [
  { value: "todos", label: "Todos os status" },
  { value: "enviado", label: "Enviados" },
  { value: "pendente", label: "Pendentes" },
  { value: "erro", label: "Com erro" },
  { value: "falha", label: "Falhas definitivas" },
];

const KIND_LABEL: Record<string, string> = {
  texto: "Texto",
  relatorio: "Relatório",
  pdf: "PDF",
  imagem: "Imagem",
};

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }) : "—";

const duracao = (e: Envio) => {
  const fim = e.sent_at ?? e.whatsapp_logs?.[e.whatsapp_logs.length - 1]?.executed_at;
  if (!fim) return null;
  const ms = new Date(fim).getTime() - new Date(e.created_at).getTime();
  if (ms < 0) return null;
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};

export default function IAAuditoria() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(
        "id, recipient_name, recipient_phone, kind, message, media_url, media_filename, status, attempts, last_error, provider, sent_at, created_at, whatsapp_logs(id, attempt, status, http_status, error, executed_at)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error("Não foi possível carregar a auditoria de envios");
    setEnvios((data ?? []) as unknown as Envio[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return envios.filter((e) => {
      if (status !== "todos" && e.status !== status) return false;
      if (!termo) return true;
      return (
        e.recipient_name.toLowerCase().includes(termo) ||
        e.recipient_phone.includes(termo.replace(/\D/g, "") || termo) ||
        (e.message ?? "").toLowerCase().includes(termo) ||
        (e.media_filename ?? "").toLowerCase().includes(termo) ||
        (e.last_error ?? "").toLowerCase().includes(termo)
      );
    });
  }, [envios, busca, status]);

  const enviados = envios.filter((e) => e.status === "enviado");
  const comErro = envios.filter((e) => e.status === "erro" || e.status === "falha").length;
  const mediaMs = (() => {
    const tempos = enviados
      .filter((e) => e.sent_at)
      .map((e) => new Date(e.sent_at!).getTime() - new Date(e.created_at).getTime())
      .filter((ms) => ms >= 0);
    if (!tempos.length) return 0;
    return tempos.reduce((s, v) => s + v, 0) / tempos.length;
  })();

  const kpis = [
    { label: "Envios registrados", valor: String(envios.length), icon: Send },
    { label: "Entregues", valor: String(enviados.length), icon: CheckCircle2 },
    { label: "Com erro", valor: String(comErro), icon: AlertTriangle },
    { label: "Tempo médio de processamento", valor: `${(mediaMs / 1000).toFixed(1)}s`, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        eyebrow="IA Executiva · ANA"
        title="Auditoria de Envios"
        description="Histórico pesquisável de tudo que a ANA enviou: quem recebeu, quando recebeu, o conteúdo, o status e o tempo de processamento."
        actions={
          <Button variant="outline" onClick={carregar} disabled={carregando}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <PageCard key={k.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{k.valor}</p>
              </div>
              <k.icon className="h-5 w-5 text-primary" />
            </div>
          </PageCard>
        ))}
      </div>

      <PageCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por destinatário, telefone, conteúdo ou erro..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageCard>

      {carregando ? (
        <PageCard>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : filtrados.length === 0 ? (
        <PageCard padded={false}>
          <EmptyState
            icon={ClipboardList}
            title="Nenhum envio encontrado"
            description="Ajuste a busca ou aguarde os próximos envios da ANA."
          />
        </PageCard>
      ) : (
        <PageCard>
          <div className="space-y-3">
            {filtrados.map((e) => (
              <div key={e.id} className="space-y-2 rounded-card border border-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          e.status === "enviado"
                            ? "outline"
                            : e.status === "pendente"
                              ? "secondary"
                              : "destructive"
                        }
                        className="capitalize"
                      >
                        {e.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[e.kind] ?? e.kind}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">
                        {e.recipient_name}
                      </span>
                      <span className="text-xs text-muted-foreground">+{e.recipient_phone}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {e.message?.slice(0, 600) ||
                        e.media_filename ||
                        e.media_url ||
                        "Sem conteúdo textual"}
                    </p>
                    {e.last_error && (
                      <p className="mt-1 text-xs text-destructive">Erro: {e.last_error}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Criado: {dataHora(e.created_at)}</p>
                    <p>Recebido: {dataHora(e.sent_at)}</p>
                    <p>
                      {e.attempts} tentativa(s)
                      {duracao(e) ? ` · ${duracao(e)}` : ""}
                      {e.provider ? ` · ${e.provider}` : ""}
                    </p>
                  </div>
                </div>

                {e.whatsapp_logs?.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-white/5 pt-2">
                    {[...e.whatsapp_logs]
                      .sort((a, b) => a.attempt - b.attempt)
                      .map((l) => (
                        <span
                          key={l.id}
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            l.status === "enviado"
                              ? "border-primary/30 text-primary"
                              : "border-destructive/30 text-destructive"
                          }`}
                          title={l.error ?? undefined}
                        >
                          #{l.attempt} {l.status} · {dataHora(l.executed_at)}
                          {l.http_status ? ` · HTTP ${l.http_status}` : ""}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </PageCard>
      )}
    </div>
  );
}
