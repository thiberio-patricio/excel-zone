import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function AlterarSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!/[A-Za-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) {
      toast.error("A senha deve conter letras e números");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) throw updateError;

      const { error: profileError } = await supabase.rpc("complete_password_change");

      if (profileError) throw profileError;

      toast.success("Senha alterada com sucesso!");
      window.location.reload();
    } catch (error: any) {
      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("known")) {
        toast.error(
          "Esta senha é muito comum e foi encontrada em vazamentos públicos. Escolha uma senha mais forte, combinando letras maiúsculas, minúsculas, números e símbolos."
        );
      } else if (msg.includes("should be different")) {
        toast.error("A nova senha deve ser diferente da senha atual.");
      } else {
        toast.error("Erro ao alterar senha: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>
            Por segurança, você deve alterar sua senha no primeiro acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova Senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme a nova senha"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
