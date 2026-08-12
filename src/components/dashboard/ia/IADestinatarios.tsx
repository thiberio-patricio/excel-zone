import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";

const STORAGE_KEY = "ana_destinatarios";

type Tipo = "diario" | "semanal" | "mensal";

interface Destinatario {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  relatorios: Tipo[];
}

const TIPO_LABEL: Record<Tipo, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

export default function IADestinatarios() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [novo, setNovo] = useState({ nome: "", cargo: "", telefone: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDestinatarios(JSON.parse(raw));
    } catch {
      // ignora dados corrompidos
    }
  }, []);

  const persistir = (lista: Destinatario[]) => {
    setDestinatarios(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  };

  const adicionar = () => {
    const telefone = novo.telefone.replace(/\D/g, "");
    if (!novo.nome.trim() || telefone.length < 10) {
      toast.error("Informe nome e um telefone válido com DDD");
      return;
    }
    persistir([
      ...destinatarios,
      {
        id: crypto.randomUUID(),
        nome: novo.nome.trim(),
        cargo: novo.cargo.trim(),
        telefone,
        relatorios: ["diario", "semanal", "mensal"],
      },
    ]);
    setNovo({ nome: "", cargo: "", telefone: "" });
    toast.success("Destinatário cadastrado");
  };

  const alternar = (d: Destinatario, t: Tipo) => {
    const relatorios = d.relatorios.includes(t)
      ? d.relatorios.filter((r) => r !== t)
      : [...d.relatorios, t];
    persistir(destinatarios.map((x) => (x.id === d.id ? { ...x, relatorios } : x)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="IA Executiva · ANA"
        title="Destinatários"
        description="Proprietários, diretores e gestores que recebem as análises da ANA pelo WhatsApp."
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
            <Input
              value={novo.cargo}
              onChange={(e) => setNovo({ ...novo, cargo: e.target.value })}
              placeholder="Diretor, Proprietário..."
            />
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
            <Button className="w-full" onClick={adicionar}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar
            </Button>
          </div>
        </div>
      </PageCard>

      <PageCard padded={destinatarios.length > 0}>
        {destinatarios.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhum destinatário cadastrado"
            description="Cadastre os gestores que receberão as análises da ANA."
          />
        ) : (
          <div className="space-y-3">
            {destinatarios.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/5 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {d.nome}
                    {d.cargo && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{d.cargo}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">+55 {d.telefone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(["diario", "semanal", "mensal"] as Tipo[]).map((t) => (
                    <Badge
                      key={t}
                      onClick={() => alternar(d, t)}
                      className={`cursor-pointer select-none ${
                        d.relatorios.includes(t)
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-transparent text-muted-foreground border border-white/10"
                      }`}
                    >
                      {TIPO_LABEL[t]}
                    </Badge>
                  ))}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => persistir(destinatarios.filter((x) => x.id !== d.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  );
}
