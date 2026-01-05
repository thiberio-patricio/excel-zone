import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarDays, Palmtree, Plus, Trash2 } from "lucide-react";

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

export default function GerenciarFeriadosFerias() {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
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

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar feriados
      const { data: feriadosData } = await supabase
        .from("feriados")
        .select("*")
        .order("data", { ascending: true });
      
      setFeriados(feriadosData || []);

      // Carregar vendedores da filial
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      const vendedorIds = rolesData?.map(r => r.user_id) || [];

      if (vendedorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", vendedorIds)
          .order("nome");

        setVendedores(profilesData || []);

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
      // Obter filial_id do usuário logado
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
          filial_id: profile?.filial_id,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Gerenciar Feriados e Férias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="feriados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="feriados" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Feriados
            </TabsTrigger>
            <TabsTrigger value="ferias" className="flex items-center gap-2">
              <Palmtree className="w-4 h-4" />
              Férias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feriados" className="space-y-4">
            <Dialog open={feriadoDialogOpen} onOpenChange={setFeriadoDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
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
                    <Input
                      id="feriadoData"
                      type="date"
                      value={feriadoData}
                      onChange={(e) => setFeriadoData(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feriadoDescricao">Descrição</Label>
                    <Input
                      id="feriadoDescricao"
                      placeholder="Ex: Natal, Ano Novo..."
                      value={feriadoDescricao}
                      onChange={(e) => setFeriadoDescricao(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSalvarFeriado} className="w-full">
                    Salvar Feriado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {feriados.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum feriado cadastrado
              </p>
            ) : (
              <div className="space-y-2">
                {feriados.map((feriado) => (
                  <div
                    key={feriado.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">{feriado.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(feriado.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExcluirFeriado(feriado.id)}
                    >
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
                <Button className="w-full">
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
                    <Select
                      value={feriasVendedorId}
                      onValueChange={setFeriasVendedorId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feriasDataInicio">Data Início</Label>
                      <Input
                        id="feriasDataInicio"
                        type="date"
                        value={feriasDataInicio}
                        onChange={(e) => setFeriasDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feriasDataFim">Data Fim</Label>
                      <Input
                        id="feriasDataFim"
                        type="date"
                        value={feriasDataFim}
                        onChange={(e) => setFeriasDataFim(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feriasObservacoes">Observações</Label>
                    <Textarea
                      id="feriasObservacoes"
                      placeholder="Observações..."
                      value={feriasObservacoes}
                      onChange={(e) => setFeriasObservacoes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSalvarFerias} className="w-full">
                    Salvar Férias
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {ferias.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma férias cadastrada
              </p>
            ) : (
              <div className="space-y-2">
                {ferias.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExcluirFerias(f.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
