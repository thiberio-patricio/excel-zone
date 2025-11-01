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
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

interface Filial {
  id: string;
  nome: string;
  endereco: string | null;
}

export default function GerenciarFiliais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoFilial, setEditandoFilial] = useState<Filial | null>(null);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    carregarFiliais();
  }, []);

  const carregarFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from("filiais")
        .select("*")
        .order("nome");

      if (error) throw error;
      setFiliais(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar filiais");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error("Nome da filial é obrigatório");
      return;
    }

    try {
      if (editandoFilial) {
        const { error } = await supabase
          .from("filiais")
          .update({ nome, endereco })
          .eq("id", editandoFilial.id);

        if (error) throw error;
        toast.success("Filial atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("filiais")
          .insert([{ nome, endereco }]);

        if (error) throw error;
        toast.success("Filial criada com sucesso!");
      }

      setDialogOpen(false);
      limparFormulario();
      carregarFiliais();
    } catch (error: any) {
      toast.error("Erro ao salvar filial: " + error.message);
    }
  };

  const handleEditar = (filial: Filial) => {
    setEditandoFilial(filial);
    setNome(filial.nome);
    setEndereco(filial.endereco || "");
    setDialogOpen(true);
  };

  const handleDeletar = async (id: string) => {
    try {
      const { error } = await supabase
        .from("filiais")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Filial deletada com sucesso!");
      carregarFiliais();
    } catch (error: any) {
      toast.error("Erro ao deletar filial: " + error.message);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEndereco("");
    setEditandoFilial(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Gerenciar Filiais
            </CardTitle>
            <CardDescription>Cadastre e gerencie as filiais da empresa</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) limparFormulario();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editandoFilial ? "Editar Filial" : "Nova Filial"}</DialogTitle>
                <DialogDescription>
                  Preencha os dados da filial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Filial Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Rua Principal, 123"
                  />
                </div>
                <Button onClick={handleSalvar} className="w-full">
                  {editandoFilial ? "Atualizar" : "Criar"} Filial
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
                <TableHead className="hidden sm:table-cell">Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filiais.map((filial) => (
                <TableRow key={filial.id}>
                  <TableCell className="font-medium">{filial.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">{filial.endereco || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditar(filial)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
                              Tem certeza que deseja deletar a filial "{filial.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletar(filial.id)}>
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
