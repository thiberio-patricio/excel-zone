import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, Users, BarChart3, ArrowRight } from "lucide-react";
import logoUnidos from "@/assets/logo-unidos.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />
        
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src={logoUnidos} 
                alt="Unidos Importados" 
                className="h-20 md:h-28 w-auto object-contain drop-shadow-md"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Sistema de Gestão de{" "}
              <span className="text-primary">Vendas</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Gerencie suas vendas, acompanhe metas e monitore o desempenho da sua equipe em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={() => navigate("/login")}
              >
                Acessar Sistema
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="group p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Metas Personalizadas</h3>
              <p className="text-muted-foreground leading-relaxed">
                Defina e acompanhe metas individuais para cada vendedor com visualização em tempo real.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:bg-secondary/15 transition-colors">
                <Users className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Gestão de Equipe</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gerencie vendedores e gerentes com controle de acesso por filial.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Relatórios Detalhados</h3>
              <p className="text-muted-foreground leading-relaxed">
                Visualize desempenho com gráficos e métricas atualizados em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Unidos Importados. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
