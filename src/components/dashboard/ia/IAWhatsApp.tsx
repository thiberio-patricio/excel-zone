import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

type Provider = "evolution" | "business";
type Kind = "texto" | "relatorio" | "pdf" | "imagem";

interface Config {
  id: string;
  provider: Provider;
  base_url: string | null;
  instance: string | null;
  phone_number_id: string | null;
  sender_label: string | null;
  active: boolean;
}

interface Mensagem {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  sent_at: string | null;
  created_at: string;
  provider: string | null;
}

const KINDS: { value: Kind; label: string; icon: typeof MessageCircle }[] = [
  { value: "texto", label: "Texto", icon: MessageCircle },
  { value: "relatorio", label: "Relatório", icon: FileText },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "imagem", label: "Imagem", icon: ImageIcon },
];

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }) : "—";

const STATUS_BADGE: Record<string, string> = {
  enviado: "bg-success/20 text-success border border-success/30",
  pendente: "bg-warning/20 text-warning border border-warning/30",
  erro: "bg-warning/20 text-warning border border-warning/30",
  falha: "bg-destructive/20 text-destructive border border-destructive/30",
};

export default function IAWhatsApp() {
  const [config, setConfig] = useState<Config | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);
  const [envio, setEnvio] = useState({
    kind: "texto" as Kind,
    nome: "",
    telefone: "",
    mensagem: "",
    mediaUrl: "",
    mediaFilename: "",
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: cfg }, { data: msgs }] = await Promise.all([
      supabase.from("whatsapp_config").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("whatsapp_messages").select("*").order("created_at", { ascending: false }).limit(60),
    ]);

    if (cfg) {
      setConfig(cfg as unknown as Config);
    } else {
      const { data: criado } = await supabase
        .from("whatsapp_config")
        .insert({})
        .select("*")
        .single();
      if (criado) setConfig(criado as unknown as Config);
    }
    setMensagens((msgs ?? []) as unknown as Mensagem[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarConfig = async (patch: Partial<Config>) => {
    if (!config) return;
    const anterior = config;
    setConfig({ ...config, ...patch });
    setSalvando(true);
    const { error } = await supabase.from("whatsapp_config").update(patch).eq("id", config.id);
    setSalvando(false);
    if (error) {
      setConfig(anterior);
      toast.error("Não foi possível salvar a configuração");
    }
  };

  const enviar = async () => {
    if (!envio.telefone.replace(/\D/g, "")) {
      toast.error("Informe o telefone com DDD");
      return;
    }
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        kind: envio.kind,
        destinos: [{ nome: envio.nome || "Destinatário", telefone: envio.telefone }],
        mensagem: envio.mensagem,
        mediaUrl: envio.mediaUrl || null,
        mediaFilename: envio.mediaFilename || null,
      },
    });
    setEnviando(false);

    if (error) toast.error("Falha ao acionar o serviço de WhatsApp");
    else if ((data as any)?.error) toast.error((data as any).error);
    else if ((data as any)?.aviso) toast.warning(`Enfileirado — ${(data as any).aviso}`);
    else if ((data as any)?.enviados > 0) toast.success("Mensagem enviada pelo WhatsApp");
    else toast.warning("Envio registrado com erro — reenvio automático agendado");
    carregar();
  };

  const reprocessar = async () => {
    setReprocessando(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-dispatch", { body: {} });
    setReprocessando(false);
    if (error) toast.error("Falha ao reprocessar a fila");
    else toast.success(`Fila processada (${(data as any)?.enviados ?? 0} enviado(s))`);
    carregar();
  };

  const isEvolution = config?.provider === "evolution";
  const precisaMidia = envio.kind === "pdf" || envio.kind === "imagem";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircle}
        eyebrow="IA Executiva · ANA"
        title="Integração WhatsApp"
        description="Camada de envio compatível com Evolution API e WhatsApp Business API, com log completo e reenvio automático (imediato, 5 min e 15 min)."
        actions={
          <Button variant="outline" onClick={reprocessar} disabled={reprocessando}>
            {reprocessando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reprocessar fila
          </Button>
        }
      />

      <PageCard>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-foreground">Provedor</h3>
          <div className="flex items-center gap-2">
            {salvando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">Ativo</span>
            <Switch
              checked={!!config?.active}
              onCheckedChange={(v) => salvarConfig({ active: v })}
            />
          </div>
        </div>

        {carregando || !config ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={config.provider}
                onValueChange={(v) => salvarConfig({ provider: v as Provider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="business">WhatsApp Business API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isEvolution ? "Endereço do servidor" : "URL base do Graph API"}</Label>
              <Input
                value={config.base_url ?? ""}
                placeholder={isEvolution ? "https://api.suaevolution.com" : "https://graph.facebook.com/v21.0"}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                onBlur={(e) => salvarConfig({ base_url: e.target.value.trim() || null })}
              />
            </div>

            {isEvolution ? (
              <div className="space-y-2">
                <Label>Instância</Label>
                <Input
                  value={config.instance ?? ""}
                  placeholder="unidos-importados"
                  onChange={(e) => setConfig({ ...config, instance: e.target.value })}
                  onBlur={(e) => salvarConfig({ instance: e.target.value.trim() || null })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  value={config.phone_number_id ?? ""}
                  placeholder="123456789012345"
                  onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                  onBlur={(e) => salvarConfig({ phone_number_id: e.target.value.trim() || null })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Identificação do remetente</Label>
              <Input
                value={config.sender_label ?? ""}
                placeholder="ANA · Unidos Importados"
                onChange={(e) => setConfig({ ...config, sender_label: e.target.value })}
                onBlur={(e) => salvarConfig({ sender_label: e.target.value.trim() || null })}
              />
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              A chave de acesso do provedor fica protegida no servidor
              {isEvolution ? " (credencial da Evolution API)" : " (token permanente da Business API)"} e nunca é
              exibida no sistema.
            </p>
          </div>
        )}
      </PageCard>

      <PageCard>
        <h3 className="mb-4 font-display text-base font-semibold text-foreground">Envio manual / teste</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de envio</Label>
            <Select value={envio.kind} onValueChange={(v) => setEnvio({ ...envio, kind: v as Kind })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={envio.nome}
              onChange={(e) => setEnvio({ ...envio, nome: e.target.value })}
              placeholder="Diretor comercial"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone (com DDD)</Label>
            <Input
              value={envio.telefone}
              onChange={(e) => setEnvio({ ...envio, telefone: e.target.value })}
              placeholder="11999999999"
            />
          </div>
          {precisaMidia && (
            <>
              <div className="space-y-2">
                <Label>Link do arquivo</Label>
                <Input
                  value={envio.mediaUrl}
                  onChange={(e) => setEnvio({ ...envio, mediaUrl: e.target.value })}
                  placeholder="https://.../relatorio.pdf"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do arquivo</Label>
                <Input
                  value={envio.mediaFilename}
                  onChange={(e) => setEnvio({ ...envio, mediaFilename: e.target.value })}
                  placeholder="relatorio-mensal.pdf"
                />
              </div>
            </>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>{precisaMidia ? "Legenda" : "Mensagem"}</Label>
            <Textarea
              rows={5}
              value={envio.mensagem}
              onChange={(e) => setEnvio({ ...envio, mensagem: e.target.value })}
              placeholder="Escreva a mensagem que será entregue no WhatsApp"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar pelo WhatsApp
          </Button>
        </div>
      </PageCard>

      <PageCard padded={mensagens.length > 0}>
        {carregando ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : mensagens.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nenhum envio registrado"
            description="Cada envio aparece aqui com data, hora, status, tentativas e erros."
          />
        ) : (
          <>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Histórico de envios ({mensagens.length})
            </h3>
            <div className="space-y-3">
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/5 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_BADGE[m.status] ?? ""}>{m.status}</Badge>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {m.kind}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {m.recipient_name} · {m.recipient_phone}
                      </span>
                      {m.provider && (
                        <Badge variant="outline" className="text-[10px]">
                          {m.provider === "evolution" ? "Evolution" : "Business"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.last_error
                        ? `Erro: ${m.last_error}`
                        : m.status === "enviado"
                          ? "Entregue ao provedor"
                          : "Aguardando envio"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="flex items-center justify-end gap-1">
                      {m.status === "enviado" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : m.status === "falha" ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {dataHora(m.sent_at ?? m.created_at)}
                    </p>
                    <p>
                      {m.attempts} de 3 tentativa(s)
                      {m.status === "erro" ? ` · reenvio ${dataHora(m.next_attempt_at)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </PageCard>
    </div>
  );
}
