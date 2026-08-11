import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, Users, BarChart3, ShieldCheck, User, ArrowLeft } from "lucide-react";
import GerenciarFiliais from "./GerenciarFiliais";
import GerenciarGerentes from "./GerenciarGerentes";
import GerenciarDiretores from "./GerenciarDiretores";
import VisualizarVendedor from "./VisualizarVendedor";
import VisaoGeral from "./VisaoGeral";
import Relatorios from "./Relatorios";
import IAExecutiva from "./IAExecutiva";

interface DiretorDashboardProps {
  role?: string;
  profile: {
    id: string;
    nome: string;
    email: string;
    foto_url: string | null;
  };
}

export default function DiretorDashboard({ profile, role }: DiretorDashboardProps) {
  const isAdmin = role === "admin";
  const validTabs = ["visao-geral", "relatorios", "filiais", "gerentes", "diretores", "vendedor", ...(isAdmin ? ["ia-executiva"] : [])];
  const initialHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialHash) ? initialHash : "visao-geral"
  );
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (validTabs.includes(h)) setActiveTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleVendedorSelecionado = (vendedorId: string) => {
    setVendedorSelecionado(vendedorId);
    setActiveTab("vendedor");
  };

  const handleVoltarDoVendedor = () => {
    setActiveTab("visao-geral");
    setVendedorSelecionado(null);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">


        <TabsContent value="visao-geral" className="mt-6">
          <VisaoGeral onVendedorSelecionado={handleVendedorSelecionado} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="ia-executiva" className="mt-6">
            <IAExecutiva />
          </TabsContent>
        )}

        <TabsContent value="relatorios" className="mt-6">
          <Relatorios />
        </TabsContent>

        <TabsContent value="filiais" className="mt-6">
          <GerenciarFiliais />
        </TabsContent>

        <TabsContent value="gerentes" className="mt-6">
          <GerenciarGerentes />
        </TabsContent>

        <TabsContent value="diretores" className="mt-6">
          <GerenciarDiretores />
        </TabsContent>

        <TabsContent value="vendedor" className="mt-6">
          {vendedorSelecionado ? (
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={handleVoltarDoVendedor}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Visão Geral
              </Button>
              <VisualizarVendedor
                vendedorId={vendedorSelecionado}
                onDataChange={() => {}}
              />
            </div>
          ) : (
            <div className="text-muted-foreground">
              Selecione um vendedor no gráfico de filial para visualizar seu calendário.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
