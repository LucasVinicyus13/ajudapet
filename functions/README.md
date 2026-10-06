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

## Alternativa gratuita: GitHub Actions

O Firebase Functions exige plano pago. Para executar a limpeza sem custo, use o GitHub Actions:

1. Crie uma conta de serviço no Firebase Console:
   - Acesse **Configurações do projeto → Contas de serviço**.
   - Gere uma nova chave JSON.
2. No repositório do GitHub, abra **Settings → Secrets and variables → Actions**.
3. Crie os segredos `FIREBASE_PROJECT_ID` com o ID `ajudapet-2d3c6` e `FIREBASE_SERVICE_ACCOUNT` com o conteúdo completo do JSON gerado.
4. Faça o push do arquivo `.github/workflows/cleanup-adopted-pets.yml`.
5. O workflow executa diariamente às 00:00 no horário de São Paulo e também pode ser acionado manualmente.

> Não faça commit da chave JSON no repositório. O GitHub Actions lê o segredo durante a execução.

A limpeza remove os posts cujo `dataAdotado` ultrapassou 7 dias, além de curtidas, denúncias relacionadas e a imagem persistida no Firebase Storage.
