import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2 } from "lucide-react";

interface Filial {
  id: string;
  nome: string;
}

interface Gerente {
  id: string;
  nome: string;
  email: string;
  filial_id: string | null;
  filial?: { nome: string };
}

export default function GerenciarGerentes() {
  const [gerentes, setGerentes] = useState<Gerente[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [filialId, setFilialId] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [filiaisRes, gerentesRes] = await Promise.all([
        supabase.from("filiais").select("*").order("nome"),
        supabase
          .from("profiles")
          .select(`
            id,
            nome,
            email,
            filial_id,
            filiais:filial_id (nome),
            user_roles!inner (role)
          `)
          .eq("user_roles.role", "gerente")
      ]);

      if (filiaisRes.error) throw filiaisRes.error;
      if (gerentesRes.error) throw gerentesRes.error;

      setFiliais(filiaisRes.data || []);
      setGerentes(gerentesRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCriarGerente = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim() || !filialId) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          role: "gerente"
        }
      });

      if (userError) throw userError;
      if (!userData.user) throw new Error("Erro ao criar usuário");

      await supabase
        .from("profiles")
        .update({ filial_id: filialId })
        .eq("id", userData.user.id);

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: userData.user.id, role: "gerente" }]);

      if (roleError) throw roleError;

      toast.success("Gerente criado com sucesso!");
      setDialogOpen(false);
      limparFormulario();
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao criar gerente: " + error.message);
    }
  };

  const handleDeletar = async (id: string, email: string) => {
    try {
      const { data, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const user = data?.users?.find((u: any) => u.email === email);
      if (user) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteAuthError) throw deleteAuthError;
      }

      toast.success("Gerente deletado com sucesso!");
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao deletar gerente: " + error.message);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setFilialId("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gerenciar Gerentes
            </CardTitle>
            <CardDescription>Cadastre gerentes e atribua a filiais</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) limparFormulario();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Gerente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Gerente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do gerente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filial">Filial *</Label>
                  <Select value={filialId} onValueChange={setFilialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((filial) => (
                        <SelectItem key={filial.id} value={filial.id}>
                          {filial.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCriarGerente} className="w-full">
                  Criar Gerente
                </Button>
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
                <TableHead className="hidden md:table-cell">Filial</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gerentes.map((gerente) => (
                <TableRow key={gerente.id}>
                  <TableCell className="font-medium">{gerente.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">{gerente.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(gerente as any).filiais?.nome || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar o gerente "{gerente.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletar(gerente.id, gerente.email)}>
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
