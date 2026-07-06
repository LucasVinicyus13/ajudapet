# Guia de Resolução de Erros - Denúncias

## Erro: "Não foi possível registrar a denúncia. Tente novamente"

Esse erro geralmente significa que as **regras de segurança do Firestore** não permitem a criação de documentos na coleção `reports`.

---

## ✅ Checklist de Verificação

### 1. Você está autenticado?
- [ ] Vejo meu avatar/nome no topo da página
- [ ] Consigo fazer login/logout

Se não conseguir fazer login, verifique se a autenticação está habilitada no Firebase Console.

### 2. As regras de Firestore estão publicadas?
- [ ] Abra o [Firebase Console](https://console.firebase.google.com)
- [ ] Selecione seu projeto `ajudapet-2d3c6`
- [ ] Vá para **Firestore Database** → **Regras**
- [ ] Verifique se mostra "Publicado" (verde)

Se não estiver publicado, copie o conteúdo de `firestore.rules` e publique.

---

## 🔧 Passos para Resolver

### Passo 1: Atualizar Regras do Firestore

1. Abra o [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto `ajudapet-2d3c6`
3. Vá para **Firestore Database** → **Regras**
4. Delete o conteúdo atual
5. Cole o seguinte código:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'lucasvinicyussanches@gmail.com';
    }

    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    match /pets/{petId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.telefone is string
        && request.resource.data.telefone != ''
        && request.resource.data.imagem is string
        && request.resource.data.imagem != ''
        && request.resource.data.cidade is string
        && request.resource.data.cidade != ''
        && request.resource.data.status in ['urgente', 'resgate', 'adotado'];

      allow update: if request.auth != null
        && (resource.data.ownerUid == request.auth.uid || isAdmin())
        && request.resource.data.ownerUid == resource.data.ownerUid;

      allow delete: if request.auth != null
        && (resource.data.ownerUid == request.auth.uid || isAdmin());
    }

    match /reports/{reportId} {
      allow read: if request.auth != null && isAdmin();
      allow create: if request.auth != null;
      allow update: if request.auth != null && isAdmin();
      allow delete: if request.auth != null && isAdmin();
    }
  }
}
```

6. Clique em **Publicar**

### Passo 2: Limpar Cache do Navegador

1. Abra o DevTools (F12)
2. Pressione `Ctrl+Shift+Delete` (Windows) ou `Cmd+Shift+Delete` (Mac)
3. Selecione:
   - ✅ Cookies e outros dados do site
   - ✅ Cache em disco
4. Clique em "Limpar dados"
5. Recarregue a página (F5)

### Passo 3: Testar Novamente

1. Faça login novamente
2. Abra um post de animal
3. Clique em "Denunciar post"
4. Selecione um motivo
5. Clique em "Enviar denúncia"

---

## 🐛 Usar Ferramentas de Debug

Se o erro persistir, você pode usar as ferramentas de diagnóstico:

### Método 1: Usar o Script de Teste (Recomendado)

1. Faça login na aplicação
2. Abra o Console do navegador (F12 → Console)
3. Execute: `testarDenuncia()`
4. Veja o resultado no console

Se receber um erro de "arquivo não encontrado", siga para o Método 2.

### Método 2: Verificar Logs Manualmente

1. Abra o Console (F12)
2. Faça uma tentativa de denúncia
3. Procure por mensagens começadas com ❌ ou erro
4. Copie a mensagem completa do erro
5. Compare com os erros conhecidos abaixo

---

## 🚨 Erros Conhecidos e Soluções

### Erro: "Missing or insufficient permissions"
**Causa**: As regras de Firestore não estão corretas ou não foram publicadas.

**Solução**:
1. Siga o **Passo 1** acima
2. Certifique-se de clicar em **Publicar** (não é Draft)
3. Aguarde 30 segundos para as regras serem aplicadas
4. Recarregue a página

---

### Erro: "Missing firebase-config.js"
**Causa**: O arquivo de configuração do Firebase não está carregado.

**Solução**:
1. Verifique se `js/firebase-config.js` existe na pasta do projeto
2. Recarregue a página
3. Abra o Console (F12) e procure por erros de carregamento

---

### Erro: "User is not authenticated"
**Causa**: Você não está logado.

**Solução**:
1. Clique no ícone de login (canto superior direito)
2. Faça login com sua conta
3. Tente fazer a denúncia novamente

---

### Erro: "Network Error"
**Causa**: Problema de conexão com a internet ou com Firebase.

**Solução**:
1. Verifique sua conexão de internet
2. Tente recarregar a página
3. Verifique se o Firebase está acessível: https://console.firebase.google.com
4. Aguarde alguns minutos e tente novamente

---

## 📞 Suporte Adicional

Se nenhuma solução funcionar:

1. Abra o Console (F12)
2. Copie **TODA** a mensagem de erro
3. Verifique a documentação:
   - [Firebase Firestore Rules](https://firebase.google.com/docs/firestore/security/start)
   - [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/troubleshoot)
4. Abra uma issue no repositório do projeto

---

## ✨ Confirmação de Sucesso

Quando a denúncia for registrada com sucesso, você verá:
1. Uma mensagem dizendo "Denúncia registrada com sucesso!"
2. O cliente de e-mail será aberto automaticamente
3. No Console, verá: ✅ Denúncia registrada com ID: ...

Isso significa que tudo está funcionando perfeitamente! 🎉
