import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";

interface Diretor {
  id: string;
  nome: string;
  email: string;
}

export default function GerenciarDiretores() {
  const [diretores, setDiretores] = useState<Diretor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "diretor");

      const ids = (rolesData || []).map((r: any) => r.user_id);
      if (ids.length === 0) {
        setDiretores([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", ids);

      if (error) throw error;
      setDiretores(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar diretores: " + error.message);
    }
  };

  const limpar = () => {
    setNome(""); setEmail(""); setSenha("");
  };

  const handleCriar = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (senha.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email: email.trim().toLowerCase(),
          password: senha,
          nome: nome.trim(),
          role: 'diretor'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Diretor criado com sucesso!");
      setDialogOpen(false);
      limpar();
      carregarDados();
    } catch (error: any) {
      const msg = error.message || "Erro desconhecido";
      if (msg.includes("already been registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error("Erro ao criar diretor: " + msg);
      }
    }
  };

  const handleDeletar = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", "diretor");
      if (error) throw error;
      toast.success("Diretor removido com sucesso!");
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao remover diretor: " + error.message);
    }
  };

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Gestão"
        title="Diretores"
        description="Cadastre outros diretores do sistema."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) limpar(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform">
                <Plus className="w-4 h-4 mr-2" />
                Novo Diretor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Diretor</DialogTitle>
                <DialogDescription>Preencha os dados do diretor</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dir-nome">Nome *</Label>
                  <Input id="dir-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dir-email">Email *</Label>
                  <Input id="dir-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dir-senha">Senha *</Label>
                  <Input id="dir-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
                </div>
                <Button onClick={handleCriar} className="w-full gradient-primary text-primary-foreground shadow-glow">Criar Diretor</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <PageCard padded={false}>
        {diretores.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nenhum diretor cadastrado" description="Crie o primeiro diretor para gerenciar o sistema." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Nome</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Email</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diretores.map((d) => (
                  <TableRow key={d.id} className="border-white/5 hover:bg-white/[0.03] transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span>{d.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {d.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.id !== currentUserId ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o diretor "{d.nome}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletar(d.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <span className="text-xs text-primary/80 font-medium px-2 py-1 rounded-full bg-primary/10 border border-primary/20">Você</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageCard>
    </div>
  );
}
