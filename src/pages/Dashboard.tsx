import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<"vendedor" | "gerente" | "diretor" | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // Buscar role do usuário
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError) throw roleError;
      
      setProfile(profileData);
      setUserRole(roleData.role);
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
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg sm:text-xl border-2 border-primary/20 shadow-lg">
              {profile.foto_url ? (
                <img
                  src={profile.foto_url}
                  alt={profile.nome}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                profile.nome.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                {profile.nome}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground capitalize font-medium">
                {userRole}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="self-end sm:self-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {profile.must_change_password ? (
        <AlterarSenha />
      ) : (
        <main className="container mx-auto px-4 py-4 sm:py-8">
          {userRole === 'diretor' ? (
            <DiretorDashboard profile={profile} />
          ) : userRole === 'gerente' ? (
            <GerenteDashboard profile={profile} />
          ) : (
            <VendedorDashboard profile={profile} />
          )}
        </main>
      )}
    </div>
  );
}
