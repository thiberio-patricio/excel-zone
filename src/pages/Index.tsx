import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { Target, Users, BarChart3, ArrowRight } from "lucide-react";
import logoUnidos from "@/assets/logo-unidos.png";
import { ThreeBackground } from "@/components/visuals/ThreeBackground";
import { useLenis } from "@/hooks/useLenis";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Target,
    tone: "bg-primary/10 group-hover:bg-primary/15",
    iconClass: "text-primary",
    title: "Metas Personalizadas",
    text: "Defina e acompanhe metas individuais para cada vendedor com visualização em tempo real.",
  },
  {
    icon: Users,
    tone: "bg-secondary/10 group-hover:bg-secondary/15",
    iconClass: "text-secondary",
    title: "Gestão de Equipe",
    text: "Gerencie vendedores e gerentes com controle de acesso por filial.",
  },
  {
    icon: BarChart3,
    tone: "bg-primary/10 group-hover:bg-primary/15",
    iconClass: "text-primary",
    title: "Relatórios Detalhados",
    text: "Visualize desempenho com gráficos e métricas atualizados em tempo real.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useLenis();

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        "[data-anim='logo']",
        { autoAlpha: 0, y: -24, scale: 0.9 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 }
      )
        .fromTo(
          "[data-anim='hero'] > *",
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 },
          "-=0.5"
        );

      gsap.to("[data-anim='glow']", {
        opacity: 0.85,
        scale: 1.15,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray<HTMLElement>("[data-anim='card']").forEach((card, i) => {
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            delay: i * 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 85%" },
          }
        );
      });

      gsap.fromTo(
        "[data-anim='footer']",
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.8,
          scrollTrigger: { trigger: "[data-anim='footer']", start: "top 95%" },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <ThreeBackground className="absolute inset-0" intensity={0.7} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div
          data-anim="glow"
          className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent opacity-50"
        />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img
                data-anim="logo"
                src={logoUnidos}
                alt="Unidos Importados"
                className="h-20 md:h-28 w-auto object-contain drop-shadow-md"
              />
            </div>

            <div data-anim="hero" className="space-y-8">
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-0.5"
                  onClick={() => navigate("/login")}
                >
                  Acessar Sistema
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                data-anim="card"
                className="group p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-xl ${f.tone} flex items-center justify-center mb-5 transition-colors group-hover:scale-110 duration-300`}
                >
                  <f.icon className={`w-7 h-7 ${f.iconClass}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer data-anim="footer" className="py-8 border-t border-border">
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
