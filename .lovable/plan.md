# Corrigir cadastro de vendedor pela gerente Joice

## Objetivo
Evitar que a tentativa de cadastrar um e-mail já existente apresente a mensagem incorreta de usuário de outra filial.

## Alterações
- Normalizar o e-mail informado antes da busca e do cadastro.
- Para gerentes, bloquear com uma mensagem clara quando o e-mail já estiver cadastrado, preservando a segurança entre filiais.
- Manter a criação de novos vendedores vinculada automaticamente à filial real da gerente.
- Publicar a função corrigida e validar o fluxo autenticado da Joice na filial CAM.

## Segurança
Nenhum cadastro existente de outra filial será transferido ou alterado. A filial continuará sendo derivada do perfil autenticado da gerente, ignorando tentativas de vínculo externo.
