# Limpeza de posts adotados

Esta função Firebase usa o Firebase Cloud Scheduler para remover automaticamente posts marcados como adotados após 7 dias.

## Configuração

1. Instale as dependências na pasta `functions`:
   ```bash
   npm install
   ```
2. Faça o login no Firebase:
   ```bash
   firebase login
   ```
3. Inicialize a configuração do projeto:
   ```bash
   firebase init functions
   ```
4. Publique a função:
   ```bash
   firebase deploy --only functions
   ```

A função é executada diariamente às 00:00 no horário de São Paulo e remove os posts cujo `dataAdotado` ultrapassou 7 dias. Ela também remove curtidas, denúncias relacionadas e a imagem persistida no Firebase Storage.
