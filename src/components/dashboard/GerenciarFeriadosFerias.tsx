import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, Palmtree, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";

interface Vendedor {
  id: string;
  nome: string;
}

interface Feriado {
  id: string;
  data: string;
  descricao: string;
  filial_id: string | null;
}

interface Ferias {
  id: string;
  vendedor_id: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string | null;
  vendedor?: { nome: string };
}

interface Folga {
  id: string;
  vendedor_id: string;
  data: string;
  motivo: string | null;
  vendedor?: { nome: string };
}

interface GerenciarFeriadosFeriasProps {
  /** Escopo opcional de filial (usado quando o diretor acessa a visão de uma filial) */
  filialId?: string | null;
}

export default function GerenciarFeriadosFerias({ filialId }: GerenciarFeriadosFeriasProps = {}) {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  
  // Formulário de feriado
  const [feriadoData, setFeriadoData] = useState("");
  const [feriadoDescricao, setFeriadoDescricao] = useState("");
  const [feriadoDialogOpen, setFeriadoDialogOpen] = useState(false);
  
  // Formulário de férias
  const [feriasVendedorId, setFeriasVendedorId] = useState("");
  const [feriasDataInicio, setFeriasDataInicio] = useState("");
  const [feriasDataFim, setFeriasDataFim] = useState("");
  const [feriasObservacoes, setFeriasObservacoes] = useState("");
  const [feriasDialogOpen, setFeriasDialogOpen] = useState(false);

  // Formulário de folga
  const [folgaVendedorId, setFolgaVendedorId] = useState("");
  const [folgaData, setFolgaData] = useState("");
  const [folgaMotivo, setFolgaMotivo] = useState("");
  const [folgaDialogOpen, setFolgaDialogOpen] = useState(false);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId]);

  const carregarDados = async () => {
    try {
      // Carregar feriados
      let feriadosQuery = supabase.from("feriados").select("*");
      if (filialId) feriadosQuery = feriadosQuery.or(`filial_id.eq.${filialId},filial_id.is.null`);
      const { data: feriadosData } = await feriadosQuery.order("data", { ascending: true });
      
      setFeriados(feriadosData || []);

      // Carregar vendedores da filial
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      const roleIds = rolesData?.map(r => r.user_id) || [];

      if (roleIds.length > 0) {
        let profilesQuery = supabase
          .from("profiles")
          .select("id, nome")
          .in("id", roleIds);
        if (filialId) profilesQuery = profilesQuery.eq("filial_id", filialId);

        const { data: profilesData } = await profilesQuery.order("nome");

        setVendedores(profilesData || []);

        const vendedorIds = (profilesData || []).map((p) => p.id);
        if (vendedorIds.length === 0) {
          setFerias([]);
          setFolgas([]);
          return;
        }

        // Carregar férias
        const { data: feriasData } = await supabase
          .from("ferias")
          .select("*")
          .in("vendedor_id", vendedorIds)
          .order("data_inicio", { ascending: true });

        // Adicionar nome do vendedor às férias
        const feriasComNome = (feriasData || []).map(f => ({
          ...f,
          vendedor: profilesData?.find(p => p.id === f.vendedor_id)
        }));

        setFerias(feriasComNome);

        // Carregar folgas
        const { data: folgasData } = await supabase
          .from("folgas")
          .select("*")
          .in("vendedor_id", vendedorIds)
          .order("data", { ascending: true });

        setFolgas((folgasData || []).map((f) => ({
          ...f,
          vendedor: profilesData?.find(p => p.id === f.vendedor_id)
        })));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };


  const handleSalvarFeriado = async () => {
    if (!feriadoData || !feriadoDescricao) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      // Obter filial_id do escopo atual (ou do usuário logado)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("filial_id")
        .eq("id", user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from("feriados")
        .insert({
          data: feriadoData,
          descricao: feriadoDescricao,
          filial_id: filialId ?? profile?.filial_id,
          created_by: user?.id
        });


      if (error) throw error;

      toast.success("Feriado cadastrado com sucesso!");
      setFeriadoData("");
      setFeriadoDescricao("");
      setFeriadoDialogOpen(false);
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao cadastrar feriado");
      console.error(error);
    }
  };

  const handleExcluirFeriado = async (id: string) => {
    try {
      const { error } = await supabase
        .from("feriados")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Feriado excluído com sucesso!");
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao excluir feriado");
      console.error(error);
    }
  };

  const handleSalvarFerias = async () => {
    if (!feriasVendedorId || !feriasDataInicio || !feriasDataFim) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (new Date(feriasDataFim) < new Date(feriasDataInicio)) {
      toast.error("Data fim deve ser maior que data início");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("ferias")
        .insert({
          vendedor_id: feriasVendedorId,
          data_inicio: feriasDataInicio,
          data_fim: feriasDataFim,
          observacoes: feriasObservacoes || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success("Férias cadastradas com sucesso!");
      setFeriasVendedorId("");
      setFeriasDataInicio("");
      setFeriasDataFim("");
      setFeriasObservacoes("");
      setFeriasDialogOpen(false);
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao cadastrar férias");
      console.error(error);
    }
  };

  const handleExcluirFerias = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ferias")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Férias excluídas com sucesso!");
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao excluir férias");
      console.error(error);
    }
  };

  const handleSalvarFolga = async () => {
    if (!folgaVendedorId || !folgaData) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("folgas")
        .insert({
          vendedor_id: folgaVendedorId,
          data: folgaData,
          motivo: folgaMotivo || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Folga cadastrada com sucesso!");
      setFolgaVendedorId("");
      setFolgaData("");
      setFolgaMotivo("");
      setFolgaDialogOpen(false);
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao cadastrar folga");
      console.error(error);
    }
  };

  const handleExcluirFolga = async (id: string) => {
    try {
      const { error } = await supabase.from("folgas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Folga excluída com sucesso!");
      carregarDados();
    } catch (error: any) {
      toast.error("Erro ao excluir folga");
      console.error(error);
    }
  };

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        eyebrow="Gestão"
        title="Férias / Feriados"
        description="Controle feriados corporativos, férias e folgas da equipe."
      />

      <PageCard>
        <Tabs defaultValue="feriados" className="space-y-5">
          <TabsList className="grid w-full grid-cols-3 bg-surface-1/60 border border-white/5 p-1 rounded-btn">
            <TabsTrigger value="feriados" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md">
              <CalendarDays className="w-4 h-4" />
              Feriados
            </TabsTrigger>
            <TabsTrigger value="ferias" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md">
              <Palmtree className="w-4 h-4" />
              Férias
            </TabsTrigger>
            <TabsTrigger value="folgas" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow rounded-md">
              <CalendarClock className="w-4 h-4" />
              Folgas
            </TabsTrigger>
          </TabsList>


          <TabsContent value="feriados" className="space-y-4">
            <Dialog open={feriadoDialogOpen} onOpenChange={setFeriadoDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Feriado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Feriado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feriadoData">Data</Label>
                    <Input id="feriadoData" type="date" value={feriadoData} onChange={(e) => setFeriadoData(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feriadoDescricao">Descrição</Label>
                    <Input id="feriadoDescricao" placeholder="Ex: Natal, Ano Novo..." value={feriadoDescricao} onChange={(e) => setFeriadoDescricao(e.target.value)} />
                  </div>
                  <Button onClick={handleSalvarFeriado} className="w-full gradient-primary text-primary-foreground shadow-glow">
                    Salvar Feriado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {feriados.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nenhum feriado cadastrado" description="Adicione feriados para excluí-los do cálculo de meta diária." />
            ) : (
              <div className="space-y-2">
                {feriados.map((feriado) => (
                  <div
                    key={feriado.id}
                    className="flex items-center justify-between p-4 rounded-btn border border-white/5 bg-surface-1/40 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{feriado.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(feriado.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleExcluirFeriado(feriado.id)} className="hover:bg-destructive/10 opacity-60 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ferias" className="space-y-4">
            <Dialog open={feriasDialogOpen} onOpenChange={setFeriasDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Férias
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novas Férias</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <Select value={feriasVendedorId} onValueChange={setFeriasVendedorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map((vendedor) => (
                          <SelectItem key={vendedor.id} value={vendedor.id}>{vendedor.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feriasDataInicio">Data Início</Label>
                      <Input id="feriasDataInicio" type="date" value={feriasDataInicio} onChange={(e) => setFeriasDataInicio(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feriasDataFim">Data Fim</Label>
                      <Input id="feriasDataFim" type="date" value={feriasDataFim} onChange={(e) => setFeriasDataFim(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feriasObservacoes">Observações</Label>
                    <Textarea id="feriasObservacoes" placeholder="Observações..." value={feriasObservacoes} onChange={(e) => setFeriasObservacoes(e.target.value)} rows={3} />
                  </div>
                  <Button onClick={handleSalvarFerias} className="w-full gradient-primary text-primary-foreground shadow-glow">
                    Salvar Férias
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {ferias.length === 0 ? (
              <EmptyState icon={Palmtree} title="Nenhuma férias cadastrada" description="Registre períodos de férias para que apareçam no calendário do vendedor." />
            ) : (
              <div className="space-y-2">
                {ferias.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-4 rounded-btn border border-white/5 bg-surface-1/40 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <Palmtree className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{f.vendedor?.nome || "Vendedor"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(f.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                          {new Date(f.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {f.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">{f.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleExcluirFerias(f.id)} className="hover:bg-destructive/10 opacity-60 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="folgas" className="space-y-4">
            <Dialog open={folgaDialogOpen} onOpenChange={setFolgaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Folga
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Folga</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <Select value={folgaVendedorId} onValueChange={setFolgaVendedorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map((vendedor) => (
                          <SelectItem key={vendedor.id} value={vendedor.id}>{vendedor.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="folgaData">Data</Label>
                    <Input id="folgaData" type="date" value={folgaData} onChange={(e) => setFolgaData(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="folgaMotivo">Motivo</Label>
                    <Textarea id="folgaMotivo" placeholder="Motivo da folga (opcional)" value={folgaMotivo} onChange={(e) => setFolgaMotivo(e.target.value)} rows={3} />
                  </div>
                  <Button onClick={handleSalvarFolga} className="w-full gradient-primary text-primary-foreground shadow-glow">
                    Salvar Folga
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {folgas.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nenhuma folga cadastrada" description="Registre folgas pontuais da equipe para considerá-las nas análises." />
            ) : (
              <div className="space-y-2">
                {folgas.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-4 rounded-btn border border-white/5 bg-surface-1/40 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <CalendarClock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{f.vendedor?.nome || "Vendedor"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        {f.motivo && <p className="text-xs text-muted-foreground mt-1">{f.motivo}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleExcluirFolga(f.id)} className="hover:bg-destructive/10 opacity-60 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </PageCard>
    </div>
  );
}

