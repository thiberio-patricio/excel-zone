import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, Target, Upload, Trash2, Users, Mail, Receipt, Pencil, Power } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { ProfilePhoto } from "@/components/ui/profile-photo";

interface GerenciarVendedoresProps {
  onUpdate: () => void;
  /** Escopo opcional de filial (usado quando o diretor acessa a visão de uma filial) */
  filialId?: string | null;
}

export default function GerenciarVendedores({ onUpdate, filialId }: GerenciarVendedoresProps) {
  const [open, setOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTicketOpen, setMetaTicketOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState<"vendedor" | "gerente">("vendedor");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendedores, setVendedores] = useState<Array<{ id: string; nome: string; email: string; foto_url: string | null; ativo: boolean }>>([]);
  const [vendedorId, setVendedorId] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  // Meta de ticket médio
  const [ticketVendedorId, setTicketVendedorId] = useState("");
  const [valorMetaTicket, setValorMetaTicket] = useState("500");
  const [ticketMes, setTicketMes] = useState(new Date().getMonth() + 1);
  const [ticketAno, setTicketAno] = useState(new Date().getFullYear());

  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Edição de cadastro
  const [editando, setEditando] = useState<{ id: string; nome: string; email: string; foto_url: string | null } | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFotoUrl, setEditFotoUrl] = useState("");
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId]);

  const carregarVendedores = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      if (rolesError) throw rolesError;

      const vendedorIds = rolesData?.map((r) => r.user_id) || [];

      if (vendedorIds.length === 0) {
        setVendedores([]);
        return;
      }

      let query = supabase
        .from("profiles")
        .select("id, nome, email, foto_url, ativo")
        .in("id", vendedorIds);

      if (filialId) query = query.eq("filial_id", filialId);

      const { data, error } = await query.order("nome");
      if (error) throw error;

      setVendedores(data || []);
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error);
      toast.error("Erro ao carregar vendedores");
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(filePath, 31536000);

      if (signedUrlError) throw signedUrlError;

      if (signedUrlData?.signedUrl) {
        setFotoUrl(signedUrlData.signedUrl);
        toast.success("Foto carregada com sucesso!");
      }
    } catch (error: any) {
      toast.error("Erro ao fazer upload da foto");
      console.error("Erro:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resolverFilialId = async (): Promise<string | null> => {
    if (filialId) return filialId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: perfil } = await supabase
      .from("profiles")
      .select("filial_id")
      .eq("id", user.id)
      .maybeSingle();
    return perfil?.filial_id ?? null;
  };

  const handleCriarUsuario = async () => {
    if (!nome || !email || !senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const filial = await resolverFilialId();
      if (!filial) {
        toast.error("Não foi possível identificar a filial");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-user-with-role", {
        body: {
          email,
          password: senha,
          nome,
          role: cargo,
          filial_id: filial,
          foto_url: fotoUrl || null,
        },
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
          { onConflict: "vendedor_id,mes,ano" }
        );

      if (metaError) throw metaError;

      toast.success("Meta de vendas definida com sucesso!");
      setVendedorId("");
      setValorMeta("");
      setMetaOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir meta");
    }
  };

  const handleCriarMetaTicket = async () => {
    if (!ticketVendedorId || !valorMetaTicket) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      // Preserva a meta de vendas já existente do mês (se houver)
      const { data: existente } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("vendedor_id", ticketVendedorId)
        .eq("mes", ticketMes)
        .eq("ano", ticketAno)
        .maybeSingle();

      const { error } = await supabase
        .from("metas")
        .upsert(
          {
            vendedor_id: ticketVendedorId,
            mes: ticketMes,
            ano: ticketAno,
            valor_meta: Number(existente?.valor_meta ?? 0),
            meta_ticket: parseFloat(valorMetaTicket),
          },
          { onConflict: "vendedor_id,mes,ano" }
        );

      if (error) throw error;

      toast.success("Meta de ticket médio definida com sucesso!");
      setTicketVendedorId("");
      setValorMetaTicket("500");
      setMetaTicketOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir meta de ticket médio");
    }
  };

  const abrirEdicao = (v: { id: string; nome: string; email: string; foto_url: string | null }) => {
    setEditando(v);
    setEditNome(v.nome);
    setEditEmail(v.email);
    setEditFotoUrl(v.foto_url || "");
  };

  const handleEditPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setUploadingEditPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: signed, error: signedError } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(filePath, 31536000);
      if (signedError) throw signedError;
      if (signed?.signedUrl) {
        setEditFotoUrl(signed.signedUrl);
        toast.success("Foto carregada com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!editando) return;
    if (!editNome.trim() || !editEmail.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setSalvandoEdicao(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: editNome.trim(),
          email: editEmail.trim(),
          foto_url: editFotoUrl || null,
        })
        .eq("id", editando.id);
      if (error) throw error;
      toast.success("Cadastro atualizado com sucesso!");
      setEditando(null);
      await carregarVendedores();
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao atualizar cadastro:", error);
      toast.error(error.message || "Erro ao atualizar cadastro");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleToggleAtivo = async (vendedor: { id: string; nome: string; ativo: boolean }) => {
    try {
      const novoStatus = !vendedor.ativo;
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: novoStatus })
        .eq("id", vendedor.id);
      if (error) throw error;

      setVendedores((prev) =>
        prev.map((v) => (v.id === vendedor.id ? { ...v, ativo: novoStatus } : v))
      );
      toast.success(`${vendedor.nome} ${novoStatus ? "ativado" : "desativado"} com sucesso!`);
      onUpdate();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error(error.message || "Erro ao alterar status do vendedor");
    }
  };

  const handleDeletarUsuario = async (userId: string) => {

    setDeletingUser(userId);
    try {
      const { error: vendasError } = await supabase.from("vendas").delete().eq("vendedor_id", userId);
      if (vendasError) throw vendasError;

      const { error: metasError } = await supabase.from("metas").delete().eq("vendedor_id", userId);
      if (metasError) throw metasError;

      const { error: rolesError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (rolesError) throw rolesError;

      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
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
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const tabTriggerClass =
    "flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md";

  return (
    <div>
      <PageHeader
        icon={Users}
        eyebrow="Gestão"
        title="Gestão de Equipe"
        description="Cadastre usuários, defina metas de vendas e de ticket médio e consulte os usuários cadastrados."
      />

      <PageCard>
        <Tabs defaultValue="novo-usuario" className="space-y-5">
          <TabsList className="grid w-full grid-cols-3 bg-surface-1/60 border border-white/5 p-1 rounded-btn">
            <TabsTrigger value="novo-usuario" className={tabTriggerClass}>
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </TabsTrigger>
            <TabsTrigger value="nova-meta" className={tabTriggerClass}>
              <Target className="w-4 h-4" />
              Nova Meta
            </TabsTrigger>
            <TabsTrigger value="usuarios" className={tabTriggerClass}>
              <Users className="w-4 h-4" />
              Usuários Cadastrados
            </TabsTrigger>
          </TabsList>

          {/* -------------------- 1. Novo Usuário -------------------- */}
          <TabsContent value="novo-usuario" className="space-y-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
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
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
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
                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    {fotoUrl && (
                      <div className="mt-2">
                        <img src={fotoUrl} alt="Preview da foto do usuário" className="w-20 h-20 rounded-full object-cover" />
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
                  <Button onClick={handleCriarUsuario} className="w-full gradient-primary text-primary-foreground shadow-glow">
                    Criar Usuário
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <p className="text-sm text-muted-foreground">
              Novos usuários são vinculados automaticamente a esta filial.
            </p>
          </TabsContent>

          {/* -------------------- 2. Nova Meta -------------------- */}
          <TabsContent value="nova-meta" className="space-y-4">
            <Tabs defaultValue="metas-vendas" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-surface-1/60 border border-white/5 p-1 rounded-btn">
                <TabsTrigger value="metas-vendas" className={tabTriggerClass}>
                  <Target className="w-4 h-4" />
                  Metas de Vendas
                </TabsTrigger>
                <TabsTrigger value="metas-ticket" className={tabTriggerClass}>
                  <Receipt className="w-4 h-4" />
                  Metas Ticket Médio
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metas-vendas">
                <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                      <Target className="w-4 h-4 mr-2" />
                      Definir Meta de Vendas
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Definir Meta de Vendas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Vendedor</Label>
                        <Select value={vendedorId} onValueChange={setVendedorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um vendedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendedores
                              .filter((v) => v.ativo)
                              .map((vendedor) => (
                                <SelectItem key={vendedor.id} value={vendedor.id}>
                                  {vendedor.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Mês</Label>
                        <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {meses.map((nomeMes, index) => (
                              <SelectItem key={index + 1} value={(index + 1).toString()}>
                                {nomeMes}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ano">Ano</Label>
                        <Input id="ano" type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="valorMeta">Valor da Meta (R$)</Label>
                        <Input id="valorMeta" type="number" step="0.01" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} placeholder="0.00" />
                      </div>
                      <Button onClick={handleCriarMeta} className="w-full gradient-primary text-primary-foreground shadow-glow">
                        Salvar Meta de Vendas
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="metas-ticket">
                <Dialog open={metaTicketOpen} onOpenChange={setMetaTicketOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                      <Receipt className="w-4 h-4 mr-2" />
                      Definir Meta de Ticket Médio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Definir Meta de Ticket Médio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Vendedor</Label>
                        <Select value={ticketVendedorId} onValueChange={setTicketVendedorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um vendedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendedores
                              .filter((v) => v.ativo)
                              .map((vendedor) => (
                                <SelectItem key={vendedor.id} value={vendedor.id}>
                                  {vendedor.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Mês</Label>
                        <Select value={ticketMes.toString()} onValueChange={(value) => setTicketMes(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {meses.map((nomeMes, index) => (
                              <SelectItem key={index + 1} value={(index + 1).toString()}>
                                {nomeMes}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ticketAno">Ano</Label>
                        <Input id="ticketAno" type="number" value={ticketAno} onChange={(e) => setTicketAno(parseInt(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="valorMetaTicket">Meta de Ticket Médio (R$)</Label>
                        <Input
                          id="valorMetaTicket"
                          type="number"
                          step="0.01"
                          value={valorMetaTicket}
                          onChange={(e) => setValorMetaTicket(e.target.value)}
                          placeholder="500.00"
                        />
                      </div>
                      <Button onClick={handleCriarMetaTicket} className="w-full gradient-primary text-primary-foreground shadow-glow">
                        Salvar Meta de Ticket Médio
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* -------------------- 3. Usuários Cadastrados -------------------- */}
          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                Usuários Cadastrados
              </h3>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                {vendedores.length} {vendedores.length === 1 ? "usuário" : "usuários"}
              </span>
            </div>

            {vendedores.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum usuário cadastrado" description="Cadastre o primeiro vendedor ou gerente para começar." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Nome</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Email</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Status</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedores.map((vendedor) => (
                      <TableRow key={vendedor.id} className="border-white/5 hover:bg-white/[0.03] transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <ProfilePhoto
                              url={vendedor.foto_url}
                              alt={vendedor.nome}
                              className="h-9 w-9 rounded-xl object-cover border border-white/10"
                              fallback={
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 text-primary font-semibold text-sm">
                                  {vendedor.nome.charAt(0).toUpperCase()}
                                </div>
                              }
                            />
                            <span>{vendedor.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {vendedor.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              vendedor.ativo
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${vendedor.ativo ? "bg-emerald-400" : "bg-amber-400"}`} />
                            {vendedor.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEdicao(vendedor)}
                            className="hover:bg-primary/10"
                            aria-label={`Editar ${vendedor.nome}`}
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAtivo(vendedor)}
                            className={vendedor.ativo ? "hover:bg-amber-500/10" : "hover:bg-emerald-500/10"}
                            aria-label={vendedor.ativo ? `Desativar ${vendedor.nome}` : `Ativar ${vendedor.nome}`}
                          >
                            <Power className={`w-4 h-4 ${vendedor.ativo ? "text-amber-400" : "text-emerald-400"}`} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={deletingUser === vendedor.id} className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário {vendedor.nome}? Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletarUsuario(vendedor.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageCard>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cadastro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input id="edit-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Alterar o email aqui atualiza apenas a exibição no sistema; o login continua o mesmo.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Foto de perfil</Label>
              <div className="flex items-center gap-3">
                <ProfilePhoto
                  url={editFotoUrl || null}
                  alt={editNome}
                  className="h-12 w-12 rounded-xl object-cover border border-white/10"
                  fallback={
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 text-primary font-semibold">
                      {(editNome || "?").charAt(0).toUpperCase()}
                    </div>
                  }
                />
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEditPhotoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingEditPhoto}
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingEditPhoto ? "Enviando..." : "Trocar foto"}
                </Button>
                {editFotoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditFotoUrl("")}>
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarEdicao}
                disabled={salvandoEdicao}
                className="gradient-primary text-primary-foreground shadow-glow"
              >
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
