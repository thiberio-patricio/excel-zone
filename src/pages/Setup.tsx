import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { setupDirectorAccount } from "@/utils/setupDirector";
import { UserPlus } from "lucide-react";

export default function Setup() {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      await setupDirectorAccount();
      toast.success("Diretor criado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao criar diretor: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Setup do Sistema</CardTitle>
          <CardDescription>
            Criar usuário diretor de teste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSetup} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Diretor"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
