import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CalendarDays,
  UserSquare2,
  Sparkles,
  Settings,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import logoUnidos from "@/assets/logo-unidos.png";

type Role = "vendedor" | "gerente" | "diretor" | "admin";

interface AppSidebarProps {
  role: Role;
  activeSection: string;
  onSelect: (section: string) => void;
}

interface NavItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: Record<Role, { label: string; items: NavItem[] }[]> = {
  diretor: [
    {
      label: "Performance",
      items: [
        { id: "visao-geral", title: "Dashboard", icon: LayoutDashboard },
        { id: "relatorios", title: "Relatórios", icon: FileText },
      ],
    },
    {
      label: "Gestão",
      items: [
        { id: "filiais", title: "Filiais", icon: Building2 },
        { id: "gerentes", title: "Gerentes", icon: Users },
        { id: "diretores", title: "Diretores", icon: ShieldCheck },
      ],
    },
  ],
  admin: [
    {
      label: "Performance",
      items: [
        { id: "visao-geral", title: "Dashboard", icon: LayoutDashboard },
        { id: "relatorios", title: "Relatórios", icon: FileText },
      ],
    },
    {
      label: "Inteligência",
      items: [
        { id: "ia-executiva", title: "IA Executiva", icon: Bot },
      ],
    },
    {
      label: "Gestão",
      items: [
        { id: "filiais", title: "Filiais", icon: Building2 },
        { id: "gerentes", title: "Gerentes", icon: Users },
        { id: "diretores", title: "Diretores", icon: ShieldCheck },
      ],
    },
  ],

  gerente: [
    {
      label: "Performance",
      items: [
        { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
        { id: "relatorios", title: "Relatórios", icon: FileText },
      ],
    },

    {
      label: "Gestão",
      items: [
        { id: "vendas", title: "Vendas", icon: UserSquare2 },
        { id: "vendedores", title: "Equipe", icon: Users },
        { id: "feriados", title: "Férias / Feriados", icon: CalendarDays },
      ],
    },
  ],
  vendedor: [
    {
      label: "Meu Espaço",
      items: [
        { id: "dashboard", title: "Meu Dashboard", icon: LayoutDashboard },
      ],
    },
  ],
};

export function AppSidebar({ role, activeSection, onSelect }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const groups = sections[role] ?? [];

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5">
      <div
        className="h-full"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 42% 11% / 0.85), hsl(0 49% 9% / 0.75))",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
        }}
      >
        <SidebarHeader className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-primary blur-md opacity-60" />
              <img
                src={logoUnidos}
                alt="Unidos Importados"
                className="relative h-10 w-10 object-contain rounded-xl"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display font-bold text-sm text-foreground">
                  Unidos
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Importados
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarSeparator className="bg-white/5" />

        <SidebarContent className="px-2 py-3">
          {groups.map((group, gi) => (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => onSelect(item.id)}
                          tooltip={item.title}
                          className={[
                            "relative h-11 rounded-btn transition-all duration-200",
                            "hover:bg-white/5 hover:translate-x-[1px]",
                            isActive
                              ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground shadow-[inset_0_0_0_1px_hsl(0_100%_52%/0.25)]"
                              : "text-muted-foreground",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-3">
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary shadow-glow" />
                            )}
                            <item.icon
                              className={`h-4 w-4 ${
                                isActive ? "text-primary" : ""
                              }`}
                            />
                            {!collapsed && (
                              <span className="text-sm font-medium">
                                {item.title}
                              </span>
                            )}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              {gi < groups.length - 1 && (
                <SidebarSeparator className="my-3 bg-white/5" />
              )}
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3">
          {!collapsed ? (
            <div className="rounded-card p-3 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                Enterprise · v2026
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                Plataforma inteligente de gestão de vendas.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          )}
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
