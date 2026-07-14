import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Building2, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { TableSkeleton } from "@/components/layout/TableSkeleton";

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

    // Configurar realtime para atualização automática
    const channel = supabase
      .channel('gerentes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          carregarDados();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          carregarDados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar filiais primeiro
      const { data: filiaisData, error: filiaisError } = await supabase
        .from("filiais")
        .select("*")
        .order("nome");

      if (filiaisError) {
        console.error("Erro ao carregar filiais:", filiaisError);
        toast.error("Erro ao carregar filiais: " + filiaisError.message);
      }

      console.log("Filiais carregadas:", filiaisData);
      setFiliais(filiaisData || []);

      if (!filiaisData || filiaisData.length === 0) {
        toast.info("Nenhuma filial cadastrada. Cadastre filiais antes de criar gerentes.");
      }

      // Carregar gerentes sem depender de relacionamento com user_roles
      // 1) Buscar IDs com role=gerente
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "gerente");

      if (rolesError) {
        console.error("Erro ao carregar roles de gerentes:", rolesError);
      }

      const gerenteIds = (rolesData || []).map((r: any) => r.user_id);
      if (gerenteIds.length === 0) {
        setGerentes([]);
        return;
      }

      // 2) Buscar perfis desses IDs
      const { data: gerentesData, error: gerentesError } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          email,
          filial_id,
          filiais:filial_id (nome)
        `)
        .in("id", gerenteIds);

      if (gerentesError) {
        console.error("Erro ao carregar gerentes:", gerentesError);
      } else {
        setGerentes(gerentesData || []);
      }
    } catch (error: any) {
      console.error("Erro geral:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarGerente = async () => {
    // Validações básicas
    if (!nome.trim() || !email.trim() || !senha.trim() || !filialId) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Digite um email válido");
      return;
    }

    // Validar tamanho da senha
    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      // Verificar se email já existe antes de tentar criar
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingProfiles) {
        toast.error("Este email já está cadastrado no sistema");
        return;
      }

      // Usar edge function para criar gerente com service_role
      const { data, error } = await supabase.functions.invoke('create-manager', {
        body: { 
          email: email.trim().toLowerCase(), 
          password: senha, 
          nome: nome.trim(),
          filial_id: filialId 
        }
      });

      if (error) throw error;
      if (data?.error) {
        // Tratar erro de email duplicado especificamente
        if (data.error.includes("already been registered")) {
          toast.error("Este email já está cadastrado no sistema");
          return;
        }
        throw new Error(data.error);
      }

      toast.success("Gerente criado com sucesso!");
      setDialogOpen(false);
      limparFormulario();
      carregarDados();
    } catch (error: any) {
      console.error("Erro ao criar gerente:", error);
      const errorMessage = error.message || "Erro desconhecido";
      
      // Mensagens de erro mais amigáveis
      if (errorMessage.includes("already been registered")) {
        toast.error("Este email já está cadastrado no sistema");
      } else if (errorMessage.includes("email")) {
        toast.error("Email inválido ou já cadastrado");
      } else {
        toast.error("Erro ao criar gerente: " + errorMessage);
      }
    }
  };

  const handleDeletar = async (id: string, email: string) => {
    try {
      // Deletar via edge function ou diretamente do perfil
      // Como deletar usuário requer service_role, vamos apenas remover o role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id)
        .eq("role", "gerente");

      if (roleError) throw roleError;

      toast.success("Gerente removido com sucesso!");
      carregarDados();
    } catch (error: any) {
      console.error("Erro ao deletar gerente:", error);
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
    <div>
      <PageHeader
        icon={Users}
        eyebrow="Gestão"
        title="Gerentes"
        description="Cadastre gerentes e atribua às filiais."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) limparFormulario(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform">
                <Plus className="w-4 h-4 mr-2" />
                Novo Gerente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Gerente</DialogTitle>
                <DialogDescription>Preencha os dados do gerente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                  {email && !email.includes("@") && (
                    <p className="text-sm text-destructive">Digite um email válido</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
                  {senha && senha.length < 6 && (
                    <p className="text-sm text-destructive">Senha deve ter no mínimo 6 caracteres</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filial">Filial *</Label>
                  <Select value={filialId} onValueChange={setFilialId}>
                    <SelectTrigger>
                      <SelectValue placeholder={filiais.length === 0 ? "Nenhuma filial cadastrada" : "Selecione a filial"} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {filiais.length === 0 ? (
                        <SelectItem value="none" disabled>Cadastre uma filial primeiro</SelectItem>
                      ) : (
                        filiais.map((filial) => (
                          <SelectItem key={filial.id} value={filial.id}>{filial.nome}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCriarGerente} className="w-full gradient-primary text-primary-foreground shadow-glow">Criar Gerente</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <PageCard padded={false}>
        {loading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : gerentes.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum gerente cadastrado" description="Cadastre o primeiro gerente para atribuir a uma filial." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Nome</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Email</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Filial</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gerentes.map((gerente) => (
                  <TableRow key={gerente.id} className="border-white/5 hover:bg-white/[0.03] transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span>{gerente.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{gerente.email}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(gerente as any).filiais?.nome ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                          <Building2 className="h-3 w-3" />
                          {(gerente as any).filiais.nome}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-destructive/10">
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
                            <AlertDialogAction onClick={() => handleDeletar(gerente.id, gerente.email)}>Deletar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

