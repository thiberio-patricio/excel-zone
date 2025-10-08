import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Target } from "lucide-react";

interface GerenciarVendedoresProps {
  onUpdate: () => void;
}

export default function GerenciarVendedores({ onUpdate }: GerenciarVendedoresProps) {
  const [open, setOpen] = useState(false);
  const [openMeta, setOpenMeta] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<'vendedor' | 'gerente'>('vendedor');

  const [metaVendedorEmail, setMetaVendedorEmail] = useState("");
  const [valorMeta, setValorMeta] = useState("");

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      toast.success(`${role === 'vendedor' ? 'Vendedor' : 'Gerente'} criado com sucesso!`);
      setOpen(false);
      setNome("");
      setEmail("");
      setSenha("");
      setRole('vendedor');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleCriarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", metaVendedorEmail)
        .single();

      if (!profiles) {
        toast.error("Vendedor não encontrado");
        return;
      }

      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();

      const { error } = await supabase
        .from("metas")
        .upsert({
          vendedor_id: profiles.id,
          mes: mesAtual,
          ano: anoAtual,
          valor_meta: parseFloat(valorMeta),
        }, {
          onConflict: 'vendedor_id,mes,ano'
        });

      if (error) throw error;

      toast.success("Meta criada com sucesso!");
      setOpenMeta(false);
      setMetaVendedorEmail("");
      setValorMeta("");
    } catch (error: any) {
      toast.error("Erro ao criar meta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">Criar Vendedor/Gerente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCriarUsuario} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'vendedor' | 'gerente')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar Usuário"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Nova Meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={openMeta} onOpenChange={setOpenMeta}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="secondary">
                Definir Meta do Mês
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta do Mês</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCriarMeta} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor-email">Email do Vendedor</Label>
                  <Input
                    id="vendedor-email"
                    type="email"
                    value={metaVendedorEmail}
                    onChange={(e) => setMetaVendedorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-meta">Valor da Meta (R$)</Label>
                  <Input
                    id="valor-meta"
                    type="number"
                    step="0.01"
                    value={valorMeta}
                    onChange={(e) => setValorMeta(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar Meta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
