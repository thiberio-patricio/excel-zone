import { createManager } from "./createManager";

// Execute this to create the manager
export async function setupManagerAccount() {
  try {
    const result = await createManager(
      "comercial2@unidosimportados.com.br",
      "123456",
      "Gerente Comercial"
    );
    console.log("Gerente criado com sucesso:", result);
    return result;
  } catch (error) {
    console.error("Erro ao criar gerente:", error);
    throw error;
  }
}
