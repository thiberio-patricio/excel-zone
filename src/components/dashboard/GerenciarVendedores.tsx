import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Target, Upload } from "lucide-react";

interface GerenciarVendedoresProps {
  onUpdate: () => void;
}

export default function GerenciarVendedores({ onUpdate }: GerenciarVendedoresProps) {
  const [open, setOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState<"vendedor" | "gerente">("vendedor");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vendedorEmail, setVendedorEmail] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      setFotoUrl(publicUrl);
      toast.success("Foto carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da foto");
      console.error("Erro:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!nome || !email || !senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            role: cargo,
            foto_url: fotoUrl || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast.success(`${cargo === "gerente" ? "Gerente" : "Vendedor"} criado com sucesso!`);
        setNome("");
        setEmail("");
        setSenha("");
        setFotoUrl("");
        setCargo("vendedor");
        setOpen(false);
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const handleCriarMeta = async () => {
    if (!vendedorEmail || !valorMeta) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { data: vendedor, error: vendedorError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", vendedorEmail)
        .single();

      if (vendedorError) throw new Error("Vendedor não encontrado");

      const { error: metaError } = await supabase
        .from("metas")
        .upsert({
          vendedor_id: vendedor.id,
          mes,
          ano,
          valor_meta: parseFloat(valorMeta),
        });

      if (metaError) throw metaError;

      toast.success("Meta definida com sucesso!");
      setVendedorEmail("");
      setValorMeta("");
      setMetaOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir meta");
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="foto">Foto do Perfil (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="foto"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg ou faça upload"
                      className="flex-1"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {fotoUrl && (
                    <div className="mt-2">
                      <img src={fotoUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select value={cargo} onValueChange={(value: "vendedor" | "gerente") => setCargo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCriarUsuario} className="w-full">
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Definir Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta de Vendas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendedorEmail">Email do Vendedor</Label>
                  <Input
                    id="vendedorEmail"
                    value={vendedorEmail}
                    onChange={(e) => setVendedorEmail(e.target.value)}
                    placeholder="vendedor@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="mes">Mês</Label>
                  <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((nome, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="valorMeta">Valor da Meta (R$)</Label>
                  <Input
                    id="valorMeta"
                    type="number"
                    step="0.01"
                    value={valorMeta}
                    onChange={(e) => setValorMeta(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleCriarMeta} className="w-full">
                  Definir Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
