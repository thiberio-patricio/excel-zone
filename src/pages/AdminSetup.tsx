import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AdminSetup() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (senha.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          password: senha,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Administrador cadastrado com sucesso!");
      setNome(""); setEmail(""); setSenha("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      if (msg.includes("already been registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error("Erro ao cadastrar administrador: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>Cadastrar Administrador</CardTitle>
          <CardDescription>
            Crie uma conta de administrador do sistema. Esta conta terá acesso total e não aparecerá nas listas de usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adm-nome">Nome *</Label>
              <Input id="adm-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-email">Email *</Label>
              <Input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@exemplo.com" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-senha">Senha *</Label>
              <Input id="adm-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...</> : "Cadastrar Administrador"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
