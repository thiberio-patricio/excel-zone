import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";

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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Gerenciar Diretores
            </CardTitle>
            <CardDescription>Cadastre outros diretores do sistema</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) limpar();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
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
                <Button onClick={handleCriar} className="w-full">Criar Diretor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diretores.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">{d.email}</TableCell>
                  <TableCell className="text-right">
                    {d.id !== currentUserId ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
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
                            <AlertDialogAction onClick={() => handleDeletar(d.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-xs text-muted-foreground">Você</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
