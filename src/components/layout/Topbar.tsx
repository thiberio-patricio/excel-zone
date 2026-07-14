import { Bell, Search, Sparkles, LogOut, Command } from "lucide-react";
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

interface TopbarProps {
  profile: {
    nome: string;
    email: string;
    foto_url: string | null;
  };
  roleLabel: string;
  onLogout: () => void;
}

export function Topbar({ profile, roleLabel, onLogout }: TopbarProps) {
  return (
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
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-btn hover:bg-white/5"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-glow" />
      </Button>

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
  );
}
