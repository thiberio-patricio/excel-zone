import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import VendedorDashboard from "@/components/dashboard/VendedorDashboard";
import GerenteDashboard from "@/components/dashboard/GerenteDashboard";
import DiretorDashboard from "@/components/dashboard/DiretorDashboard";
import AlterarSenha from "@/components/dashboard/AlterarSenha";

interface Profile {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  filial_id: string | null;
  must_change_password: boolean;
}

type Role = "vendedor" | "gerente" | "diretor" | "admin";

const defaultSection: Record<Role, string> = {
  diretor: "visao-geral",
  admin: "visao-geral",
  gerente: "dashboard",
  vendedor: "dashboard",
};

const roleLabels: Record<string, string> = {
  vendedor: "Vendedor",
  gerente: "Gerente",
  diretor: "Diretor",
  admin: "Administrador",
};

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("visao-geral");
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData, error } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).single();
      if (roleError) throw roleError;

      setProfile(profileData);
      setUserRole(roleData.role as Role);
      setActiveSection(defaultSection[roleData.role as Role]);
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch {
      toast.error("Erro ao fazer logout");
    }
  };

  const handleSelect = (section: string) => {
    setActiveSection(section);
    // sync via hash so child dashboards can pick up
    window.location.hash = section;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !userRole) return null;

  if (profile.must_change_password) {
    return (
      <div className="min-h-screen gradient-hero">
        <AlterarSenha />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full gradient-hero">
        <AppSidebar
          role={userRole}
          activeSection={activeSection}
          onSelect={handleSelect}
        />
        <SidebarInset className="bg-transparent">
          <Topbar
            profile={profile}
            roleLabel={roleLabels[userRole]}
            onLogout={handleLogout}
          />
          <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10 animate-fade-in">
            <div className="mx-auto max-w-[1400px]">
              {(userRole === "diretor" || userRole === "admin") ? (
                <DiretorDashboard profile={profile} />
              ) : userRole === "gerente" ? (
                <GerenteDashboard profile={profile} />
              ) : (
                <VendedorDashboard profile={profile} />
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
