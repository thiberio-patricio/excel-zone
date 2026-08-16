import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, MessageCircle, Loader2, RefreshCw, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/layout/EmptyState";

const CARGOS = [
  { value: "proprietario", label: "Proprietário" },
  { value: "diretor", label: "Diretor" },
  { value: "gerente", label: "Gerente" },
  { value: "supervisor", label: "Supervisor" },
];

const ALERTAS = [
  { value: "diario", label: "Relatório diário" },
  { value: "semanal", label: "Relatório semanal" },
  { value: "mensal", label: "Relatório mensal" },
  { value: "alertas", label: "Alertas inteligentes" },
  { value: "metas", label: "Risco de meta" },
  { value: "ranking", label: "Ranking de lojas" },
];

interface Filial {
  id: string;
  nome: string;
}

interface Destinatario {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  lojas: string[];
  alert_types: string[];
  active: boolean;
}

const cargoLabel = (v: string) => CARGOS.find((c) => c.value === v)?.label ?? v;

export default function IADestinatarios() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cargo: "diretor", telefone: "" });
  const [novasLojas, setNovasLojas] = useState<string[]>([]);
  const [novosAlertas, setNovosAlertas] = useState<string[]>(["diario", "semanal", "mensal", "alertas"]);

  const nomeFilial = useMemo(
    () => new Map(filiais.map((f) => [f.id, f.nome])),
    [filiais],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: dest, error }, { data: fil }] = await Promise.all([
      supabase.from("ai_recipients").select("*").order("created_at", { ascending: true }),
      supabase.from("filiais").select("id, nome").order("nome"),
    ]);
    if (error) toast.error("Não foi possível carregar os destinatários");
    setDestinatarios((dest ?? []) as unknown as Destinatario[]);
    setFiliais((fil ?? []) as Filial[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionar = async () => {
    const telefone = novo.telefone.replace(/\D/g, "");
    if (!novo.nome.trim() || telefone.length < 10) {
      toast.error("Informe nome e um telefone válido com DDD");
      return;
    }
    if (!novosAlertas.length) {
      toast.error("Autorize pelo menos um tipo de alerta");
      return;
    }
    setSalvando(true);
    const { data: sessao } = await supabase.auth.getUser();
    const { error } = await supabase.from("ai_recipients").insert({
      nome: novo.nome.trim(),
      cargo: novo.cargo,
      telefone,
      lojas: novasLojas,
      alert_types: novosAlertas,
      created_by: sessao?.user?.id ?? null,
    });
    setSalvando(false);
    if (error) {
      toast.error("Falha ao cadastrar destinatário");
      return;
    }
    setNovo({ nome: "", cargo: "diretor", telefone: "" });
    setNovasLojas([]);
    setNovosAlertas(["diario", "semanal", "mensal", "alertas"]);
    toast.success("Destinatário cadastrado");
    carregar();
  };

  const atualizar = async (d: Destinatario, patch: Partial<Destinatario>) => {
    setDestinatarios((lista) => lista.map((x) => (x.id === d.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("ai_recipients").update(patch).eq("id", d.id);
    if (error) {
      toast.error("Falha ao atualizar destinatário");
      carregar();
    }
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("ai_recipients").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao remover destinatário");
      return;
    }
    setDestinatarios((lista) => lista.filter((x) => x.id !== id));
    toast.success("Destinatário removido");
  };

  const alternarAlerta = (d: Destinatario, tipo: string) =>
    atualizar(d, {
      alert_types: d.alert_types.includes(tipo)
        ? d.alert_types.filter((t) => t !== tipo)
        : [...d.alert_types, tipo],
    });

  const alternarLoja = (d: Destinatario, id: string) =>
    atualizar(d, {
      lojas: d.lojas.includes(id) ? d.lojas.filter((l) => l !== id) : [...d.lojas, id],
    });

  const toggleNovaLoja = (id: string) =>
    setNovasLojas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const toggleNovoAlerta = (v: string) =>
    setNovosAlertas((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="IA Executiva · ANA"
        title="Central de Destinatários"
        description="Proprietários, diretores, gerentes e supervisores que recebem as análises da ANA pelo WhatsApp, com lojas vinculadas e alertas autorizados."
        actions={
          <Button variant="outline" onClick={carregar} disabled={carregando}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <PageCard>
        <h3 className="mb-4 font-display text-base font-semibold text-foreground">Novo destinatário</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={novo.cargo} onValueChange={(v) => setNovo({ ...novo, cargo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp (DDD + número)</Label>
            <Input
              value={novo.telefone}
              onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
              placeholder="11999999999"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={adicionar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Cadastrar
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Lojas vinculadas (vazio = todas)</Label>
            <div className="flex flex-wrap gap-2">
              {filiais.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma filial cadastrada.</p>
              ) : (
                filiais.map((f) => (
                  <Badge
                    key={f.id}
                    onClick={() => toggleNovaLoja(f.id)}
                    className={`cursor-pointer select-none ${
                      novasLojas.includes(f.id)
                        ? "border border-primary/30 bg-primary/20 text-primary"
                        : "border border-white/10 bg-transparent text-muted-foreground"
                    }`}
                  >
                    <Store className="mr-1 h-3 w-3" />
                    {f.nome}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipos de alertas autorizados</Label>
            <div className="flex flex-wrap gap-2">
              {ALERTAS.map((a) => (
                <Badge
                  key={a.value}
                  onClick={() => toggleNovoAlerta(a.value)}
                  className={`cursor-pointer select-none ${
                    novosAlertas.includes(a.value)
                      ? "border border-primary/30 bg-primary/20 text-primary"
                      : "border border-white/10 bg-transparent text-muted-foreground"
                  }`}
                >
                  {a.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PageCard>

      {carregando ? (
        <PageCard>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : destinatarios.length === 0 ? (
        <PageCard padded={false}>
          <EmptyState
            icon={MessageCircle}
            title="Nenhum destinatário cadastrado"
            description="Cadastre os gestores que receberão as análises da ANA."
          />
        </PageCard>
      ) : (
        <PageCard>
          <div className="space-y-3">
            {destinatarios.map((d) => (
              <div key={d.id} className="space-y-3 rounded-card border border-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {d.nome}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {cargoLabel(d.cargo)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">+55 {d.telefone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ativo</span>
                      <Switch
                        checked={d.active}
                        onCheckedChange={(v) => atualizar(d, { active: v })}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Lojas vinculadas{" "}
                      {d.lojas.length === 0 && <span className="normal-case">(todas)</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filiais.map((f) => (
                        <Badge
                          key={f.id}
                          onClick={() => alternarLoja(d, f.id)}
                          className={`cursor-pointer select-none ${
                            d.lojas.includes(f.id)
                              ? "border border-primary/30 bg-primary/20 text-primary"
                              : "border border-white/10 bg-transparent text-muted-foreground"
                          }`}
                        >
                          {nomeFilial.get(f.id) ?? f.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Alertas autorizados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALERTAS.map((a) => (
                        <Badge
                          key={a.value}
                          onClick={() => alternarAlerta(d, a.value)}
                          className={`cursor-pointer select-none ${
                            d.alert_types.includes(a.value)
                              ? "border border-primary/30 bg-primary/20 text-primary"
                              : "border border-white/10 bg-transparent text-muted-foreground"
                          }`}
                        >
                          {a.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageCard>
      )}
    </div>
  );
}
