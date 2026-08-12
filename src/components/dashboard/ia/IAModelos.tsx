import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const STORAGE_KEY = "ana_modelos";

type Tipo = "diario" | "semanal" | "mensal" | "alerta";

interface Modelo {
  id: string;
  nome: string;
  tipo: Tipo;
  conteudo: string;
}

const TIPO_LABEL: Record<Tipo, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
  alerta: "Alerta",
};

const PADROES: Modelo[] = [
  {
    id: "padrao-diario",
    nome: "Resumo diário",
    tipo: "diario",
    conteudo:
      "Olá {{destinatario}}, aqui é a ANA.\n\n*Panorama* — {{periodo}}: vendemos {{vendido}} para uma meta de {{meta}} ({{atingimento}}).\n\n*Destaques*\n• {{destaques}}\n\n*Pontos de atenção*\n• {{atencoes}}\n\n*Recomendações da ANA*\n• {{recomendacoes}}\n\nANA — Assistente Virtual de Gestão de Vendas",
  },
  {
    id: "padrao-alerta",
    nome: "Alerta de risco de meta",
    tipo: "alerta",
    conteudo:
      "Olá {{destinatario}}, ANA na escuta.\n\n*Alerta* — a loja {{loja}} está com atingimento de {{atingimento}} e ritmo abaixo do necessário para a meta de {{meta}}.\n\n*Ação sugerida*\n• {{recomendacoes}}\n\nANA — Assistente Virtual de Gestão de Vendas",
  },
];

const VARIAVEIS = [
  "{{destinatario}}",
  "{{periodo}}",
  "{{loja}}",
  "{{vendido}}",
  "{{meta}}",
  "{{atingimento}}",
  "{{ticket}}",
  "{{destaques}}",
  "{{atencoes}}",
  "{{recomendacoes}}",
];

export default function IAModelos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [novo, setNovo] = useState<{ nome: string; tipo: Tipo }>({ nome: "", tipo: "diario" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setModelos(raw ? JSON.parse(raw) : PADROES);
    } catch {
      setModelos(PADROES);
    }
  }, []);

  const persistir = (lista: Modelo[]) => {
    setModelos(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  };

  const adicionar = () => {
    if (!novo.nome.trim()) {
      toast.error("Informe um nome para o modelo");
      return;
    }
    persistir([
      ...modelos,
      { id: crypto.randomUUID(), nome: novo.nome.trim(), tipo: novo.tipo, conteudo: "" },
    ]);
    setNovo({ nome: "", tipo: "diario" });
    toast.success("Modelo criado");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        eyebrow="IA Executiva · ANA"
        title="Modelos de Mensagens"
        description="Padronize a estrutura das mensagens enviadas pela ANA usando variáveis dinâmicas."
      />

      <PageCard>
        <h3 className="mb-4 font-display text-base font-semibold text-foreground">Novo modelo</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label>Nome</Label>
            <Input
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex.: Fechamento mensal"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={novo.tipo} onValueChange={(v) => setNovo({ ...novo, tipo: v as Tipo })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={adicionar}>
              <Plus className="mr-2 h-4 w-4" />
              Criar modelo
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Variáveis disponíveis
          </p>
          <div className="flex flex-wrap gap-2">
            {VARIAVEIS.map((v) => (
              <Badge
                key={v}
                variant="outline"
                className="cursor-pointer font-mono text-[10px]"
                onClick={async () => {
                  await navigator.clipboard.writeText(v);
                  toast.success(`${v} copiada`);
                }}
              >
                {v}
              </Badge>
            ))}
          </div>
        </div>
      </PageCard>

      {modelos.length === 0 ? (
        <PageCard padded={false}>
          <EmptyState
            icon={FileText}
            title="Nenhum modelo cadastrado"
            description="Crie modelos para padronizar as mensagens da ANA."
          />
        </PageCard>
      ) : (
        <div className="space-y-4">
          {modelos.map((m) => (
            <PageCard key={m.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {TIPO_LABEL[m.tipo]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(m.conteudo);
                      toast.success("Modelo copiado");
                    }}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      persistir(modelos);
                      toast.success("Modelo salvo");
                    }}
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Salvar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => persistir(modelos.filter((x) => x.id !== m.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <Textarea
                rows={8}
                value={m.conteudo}
                onChange={(e) =>
                  setModelos(modelos.map((x) => (x.id === m.id ? { ...x, conteudo: e.target.value } : x)))
                }
                className="font-mono text-sm leading-relaxed"
              />
            </PageCard>
          ))}
        </div>
      )}
    </div>
  );
}
