import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BarChart3 } from "lucide-react";
import GerenciarFiliais from "./GerenciarFiliais";
import GerenciarGerentes from "./GerenciarGerentes";
import VisaoGeral from "./VisaoGeral";

interface DiretorDashboardProps {
  profile: {
    id: string;
    nome: string;
    email: string;
    foto_url: string | null;
  };
}

export default function DiretorDashboard({ profile }: DiretorDashboardProps) {
  const [activeTab, setActiveTab] = useState("visao-geral");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="filiais" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Filiais</span>
          </TabsTrigger>
          <TabsTrigger value="gerentes" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Gerentes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <VisaoGeral />
        </TabsContent>

        <TabsContent value="filiais" className="mt-6">
          <GerenciarFiliais />
        </TabsContent>

        <TabsContent value="gerentes" className="mt-6">
          <GerenciarGerentes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
