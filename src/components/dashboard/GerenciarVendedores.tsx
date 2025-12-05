import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Target, Upload, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GerenciarVendedoresProps {
  onUpdate: () => void;
}

export default function GerenciarVendedores({ onUpdate }: GerenciarVendedoresProps) {
  const [open, setOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState<"vendedor" | "gerente">("vendedor");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string; email: string; foto_url: string | null }>>([]);
  const [vendedorId, setVendedorId] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    carregarVendedores();
  }, []);

  const carregarVendedores = async () => {
    console.log("=== INICIANDO carregarVendedores ===");
    try {
      // Buscar todos os user_ids de vendedores
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      console.log("Roles data:", rolesData?.length, "roles encontrados");
      
      if (rolesError) {
        console.error("Erro ao buscar roles:", rolesError);
        throw rolesError;
      }

      const vendedorIds = rolesData?.map(r => r.user_id) || [];
      console.log("IDs de vendedores:", vendedorIds);

      if (vendedorIds.length > 0) {
        // Buscar perfis dos vendedores
        const { data, error } = await supabase
          .from("profiles")
          .select("id, nome, email, foto_url")
          .in("id", vendedorIds)
          .order("nome");

        console.log("Profiles data:", data?.length, "perfis encontrados", data);
        
        if (error) {
          console.error("Erro ao buscar perfis:", error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log("Atualizando estado com", data.length, "vendedores");
          setVendedores(data);
        } else {
          console.log("Nenhum perfil encontrado, mantendo estado vazio");
          setVendedores([]);
        }
      } else {
        console.log("Nenhum role de vendedor encontrado");
        setVendedores([]);
      }
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error);
      toast.error("Erro ao carregar vendedores");
    }
    console.log("=== FIM carregarVendedores ===");
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      setFotoUrl(publicUrl);
      toast.success("Foto carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da foto");
      console.error("Erro:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!nome || !email || !senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Buscar a filial do gerente logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: gerenteProfile } = await supabase
        .from("profiles")
        .select("filial_id")
        .eq("id", user.id)
        .single();

      if (!gerenteProfile?.filial_id) {
        toast.error("Erro ao obter filial do gerente");
        return;
      }

      // Usar edge function para criar usuário sem afetar a sessão atual
      const { data, error } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email,
          password: senha,
          nome,
          role: cargo,
          filial_id: gerenteProfile.filial_id,
          foto_url: fotoUrl || null
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${cargo === "gerente" ? "Gerente" : "Vendedor"} criado com sucesso!`);
      setNome("");
      setEmail("");
      setSenha("");
      setFotoUrl("");
      setCargo("vendedor");
      setOpen(false);
      
      // Recarregar dados após um pequeno delay para o trigger processar
      setTimeout(async () => {
        await carregarVendedores();
        onUpdate();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const handleCriarMeta = async () => {
    if (!vendedorId || !valorMeta) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { error: metaError } = await supabase
        .from("metas")
        .upsert(
          {
            vendedor_id: vendedorId,
            mes,
            ano,
            valor_meta: parseFloat(valorMeta),
          },
          {
            onConflict: "vendedor_id,mes,ano"
          }
        );

      if (metaError) throw metaError;

      toast.success("Meta definida com sucesso!");
      setVendedorId("");
      setValorMeta("");
      setMetaOpen(false);
      onUpdate(); // Atualiza dashboard quando meta é criada/atualizada
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir meta");
    }
  };

  const handleDeletarUsuario = async (userId: string) => {
    setDeletingUser(userId);
    try {
      // Deletar vendas do usuário
      const { error: vendasError } = await supabase
        .from("vendas")
        .delete()
        .eq("vendedor_id", userId);

      if (vendasError) throw vendasError;

      // Deletar metas do usuário
      const { error: metasError } = await supabase
        .from("metas")
        .delete()
        .eq("vendedor_id", userId);

      if (metasError) throw metasError;

      // Deletar roles do usuário
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      // Deletar perfil do usuário
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      toast.success("Usuário deletado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário");
      console.error("Erro ao deletar:", error);
    } finally {
      setDeletingUser(null);
      await carregarVendedores();
      onUpdate();
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="space-y-4">
      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((vendedor) => (
                <TableRow key={vendedor.id}>
                  <TableCell className="font-medium">{vendedor.nome}</TableCell>
                  <TableCell>{vendedor.email}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingUser === vendedor.id}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o usuário {vendedor.nome}? 
                            Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletarUsuario(vendedor.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar Usuário
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="foto">Foto do Perfil (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="foto"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg ou faça upload"
                      className="flex-1"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {fotoUrl && (
                    <div className="mt-2">
                      <img src={fotoUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select value={cargo} onValueChange={(value: "vendedor" | "gerente") => setCargo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCriarUsuario} className="w-full">
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nova Meta</CardTitle>
          </CardHeader>
        <CardContent>
          <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Definir Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta de Vendas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendedor">Vendedor</Label>
                  <Select value={vendedorId} onValueChange={setVendedorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mes">Mês</Label>
                  <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((nome, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="valorMeta">Valor da Meta (R$)</Label>
                  <Input
                    id="valorMeta"
                    type="number"
                    step="0.01"
                    value={valorMeta}
                    onChange={(e) => setValorMeta(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleCriarMeta} className="w-full">
                  Definir Meta
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
