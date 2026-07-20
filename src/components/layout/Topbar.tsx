import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Search,
  Sparkles,
  LogOut,
  Command,
  Check,
  Trash2,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CalendarDays,
  UserSquare2,
  FileText,
  Inbox,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ProfilePhoto } from "@/components/ui/profile-photo";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

type Role = "vendedor" | "gerente" | "diretor" | "admin";

interface TopbarProps {
  profile: {
    nome: string;
    email: string;
    foto_url: string | null;
  };
  roleLabel: string;
  role: Role;
  onLogout: () => void;
  onNavigate?: (section: string) => void;
}

interface SearchItem {
  id: string;
  title: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "visao-geral": LayoutDashboard,
  dashboard: LayoutDashboard,
  relatorios: FileText,
  filiais: Building2,
  gerentes: Users,
  diretores: ShieldCheck,
  vendas: UserSquare2,
  vendedores: Users,
  feriados: CalendarDays,
};

const sectionsByRole: Record<Role, { group: string; items: string[] }[]> = {
  diretor: [
    { group: "Performance", items: ["visao-geral", "relatorios"] },
    { group: "Gestão", items: ["filiais", "gerentes", "diretores"] },
  ],
  admin: [
    { group: "Performance", items: ["visao-geral", "relatorios"] },
    { group: "Gestão", items: ["filiais", "gerentes", "diretores"] },
  ],
  gerente: [
    { group: "Performance", items: ["dashboard", "relatorios"] },
    { group: "Gestão", items: ["vendas", "vendedores", "feriados"] },
  ],
  vendedor: [{ group: "Meu Espaço", items: ["dashboard"] }],
};

const sectionTitles: Record<string, string> = {
  "visao-geral": "Dashboard",
  dashboard: "Dashboard",
  relatorios: "Relatórios",
  filiais: "Filiais",
  gerentes: "Gerentes",
  diretores: "Diretores",
  vendas: "Vendas",
  vendedores: "Equipe",
  feriados: "Férias / Feriados",
};

export function Topbar({
  profile,
  roleLabel,
  role,
  onLogout,
  onNavigate,
}: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const searchItems: SearchItem[] = useMemo(() => {
    const groups = sectionsByRole[role] ?? [];
    return groups.flatMap((g) =>
      g.items.map((id) => ({
        id,
        title: sectionTitles[id] ?? id,
        group: g.group,
        icon: sectionIcons[id] ?? LayoutDashboard,
      }))
    );
  }, [role]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelectSection = (id: string) => {
    setSearchOpen(false);
    onNavigate?.(id);
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-white/5"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 42% 11% / 0.85), hsl(0 49% 9% / 0.6))",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        {/* Global search — Linear-style */}
        <div className="flex-1 max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group w-full flex items-center gap-3 h-10 px-4 rounded-btn border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/30 transition-all duration-200"
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground flex-1 text-left">
              Pesquisar em toda a plataforma...
            </span>
            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/10">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
        </div>

        {/* AI active indicator */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-btn border border-primary/20 bg-primary/5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-glow" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">IA ativa</span>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-btn hover:bg-white/5"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary shadow-glow ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 sm:w-96 glass border-white/10 p-0"
          >
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </DropdownMenuLabel>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Nenhuma notificação</span>
                </div>
              ) : (
                notifications
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(a.read) - Number(b.read) ||
                      new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                  )
                  .map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 px-4 py-3 cursor-pointer rounded-none focus:bg-white/5",
                        n.read ? "opacity-60" : "bg-primary/[0.03]"
                      )}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary shadow-glow" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {n.description}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatDate(n.createdAt)}
                      </span>
                    </DropdownMenuItem>
                  ))
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <div className="px-4 py-2 text-[10px] text-muted-foreground/60 text-center">
                  {unreadCount === 0
                    ? "Você está em dia com suas notificações."
                    : `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 h-10 pl-1 pr-3 rounded-btn hover:bg-white/5 transition-colors">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-primary blur-sm opacity-50" />
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm overflow-hidden border border-white/10">
                  <ProfilePhoto
                    url={profile.foto_url}
                    alt={profile.nome}
                    className="w-full h-full object-cover"
                    fallback={<>{profile.nome.charAt(0).toUpperCase()}</>}
                  />
                </div>
              </div>
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-foreground">
                  {profile.nome}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                  {roleLabel}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass border-white/10">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{profile.nome}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Command palette */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar módulos, páginas e ações..." />
        <CommandList>
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado.
          </CommandEmpty>
          {Object.entries(
            searchItems.reduce<Record<string, SearchItem[]>>((acc, item) => {
              acc[item.group] = acc[item.group] ?? [];
              acc[item.group].push(item);
              return acc;
            }, {})
          ).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${group}`}
                  onSelect={() => handleSelectSection(item.id)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Ações">
            <CommandItem
              onSelect={() => {
                setSearchOpen(false);
                onLogout();
              }}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Sair da conta</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
