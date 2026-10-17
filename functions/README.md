# Limpeza de posts adotados

Esta função Firebase usa o Firebase Cloud Scheduler para remover automaticamente posts marcados como adotados após 7 dias.

## Limpeza automática de notificações lidas

O workflow `.github/workflows/cleanup-read-notifications.yml` remove as notificações com `viewed: true` a cada hora, no minuto 19 (UTC). Notificações não lidas são preservadas. O workflow também pode ser executado manualmente pelo GitHub Actions.

Ele usa os segredos `FIREBASE_PROJECT_ID` e `FIREBASE_SERVICE_ACCOUNT` já configurados para a limpeza de posts adotados.

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
4. Faça o push dos arquivos `.github/workflows/cleanup-adopted-pets.yml` e `.github/workflows/cleanup-read-notifications.yml`.
5. Os workflows executam suas limpezas a cada hora (nos minutos 17 e 19, respectivamente; o agendamento do GitHub Actions usa UTC) e também podem ser acionados manualmente.

> Não faça commit da chave JSON no repositório. O GitHub Actions lê o segredo durante a execução.

A limpeza de posts verifica a cada hora aqueles com status `adotado` e remove os que completaram pelo menos 7 dias nessa condição, além de curtidas, denúncias relacionadas e a imagem persistida no Firebase Storage. A limpeza de notificações remove apenas aquelas já marcadas como lidas.
