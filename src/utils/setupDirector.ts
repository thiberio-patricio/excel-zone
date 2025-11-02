import { createUserWithRole } from "./createUserWithRole";

// Execute this to create the director
export async function setupDirectorAccount() {
  try {
    const result = await createUserWithRole(
      "thiberio.fsa@gmail.com",
      "123456",
      "Diretor",
      "diretor"
    );
    console.log("Diretor criado com sucesso:", result);
    return result;
  } catch (error) {
    console.error("Erro ao criar diretor:", error);
    throw error;
  }
}
