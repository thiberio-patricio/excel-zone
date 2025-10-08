import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Users, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Sistema de Gestão de Vendas
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gerencie suas vendas, acompanhe metas e monitore o desempenho da sua equipe em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-lg px-8"
              onClick={() => navigate("/login")}
            >
              Acessar Sistema
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-16">
            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Metas Personalizadas</h3>
              <p className="text-sm text-muted-foreground">
                Defina e acompanhe metas individuais para cada vendedor
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Gestão de Equipe</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie vendedores e gerentes com controle de acesso
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Relatórios Detalhados</h3>
              <p className="text-sm text-muted-foreground">
                Visualize desempenho com gráficos e métricas em tempo real
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
