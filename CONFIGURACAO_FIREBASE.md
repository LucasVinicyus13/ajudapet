# Guia de Configuração - AjudaPet

## Regras de Firestore (Firebase Console)

Para que todas as funcionalidades funcionem corretamente, você precisa atualizar as regras de segurança do Firestore.

### Passo 1: Acessar Firebase Console
1. Vá para [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione seu projeto `ajudapet-2d3c6`
3. Vá para **Firestore Database** > **Regras**

### Passo 2: Substituir as Regras

Cole o seguinte código nas regras do Firestore:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'lucasvinicyussanches@gmail.com';
    }

    // Coleção de Usuários
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    // Coleção de Animais
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

    // Coleção de Denúncias
    match /reports/{reportId} {
      allow read: if request.auth != null && isAdmin();
      allow create: if request.auth != null;
      allow update: if request.auth != null && isAdmin();
      allow delete: if request.auth != null && isAdmin();
    }
  }
}
```

### Passo 3: Publicar as Regras

1. Clique em **Publicar**
2. Confirme a ação

---

## Configuração de Autenticação

### Habilitar Email/Senha (se não estiver habilitado)

1. No Firebase Console, vá para **Authentication**
2. Clique em **Métodos de login**
3. Certifique-se de que **Email/Senha** está habilitado
4. Se necessário, clique em **Editar** e habilite

### Habilitar Claims Customizados para Admin (opcional, mas recomendado)

Se você quiser que o sistema reconheça automaticamente admins sem depender apenas de email:

1. No Firebase Console, vá para **Cloud Functions** ou use o Firebase CLI
2. Execute:
```bash
firebase functions:config:set claims.admin_email="lucasvinicyussanches@gmail.com"
```

Isso garante que o e-mail especificado sempre terá permissões de administrador.

---

## Testando as Denúncias

1. **Faça login** com uma conta regular
2. **Abra um post** de animal
3. **Clique em "Denunciar post"**
4. **Selecione um motivo** e clique em **"Enviar denúncia"**
5. A denúncia deverá ser registrada e um link de e-mail será aberto

Se ainda receber o erro **"Missing or insufficient permissions"**:

### Solução de Problemas

1. **Verifique se está logado**: A página deve mostrar seu avatar/perfil no topo
2. **Limpe o cache do navegador**: Pressione `Ctrl+Shift+Delete` e limpe cookies/cache
3. **Verifique se as regras foram publicadas**: No Firebase Console, veja se o status mostra "Publicado"
4. **Teste com outra conta**: Crie uma nova conta de teste para descartar problemas de sessão

---

## Acessar Página de Verificação de Posts (Admin)

1. **Faça login** com a conta de administrador: `lucasvinicyussanches@gmail.com`
2. Você terá acesso automático a `/pages/verificar-post.html?id=<pet_id>`
3. Se não for admin e tentar acessar, será redirecionado para a home

---

## Estrutura das Coleções no Firestore

### Coleção: `users`
```json
{
  "uid": "user_id",
  "email": "usuario@exemplo.com",
  "displayName": "Nome do Usuário",
  "avatarUrl": "https://...",
  "isAdmin": false
}
```

### Coleção: `pets`
```json
{
  "id": "pet_id",
  "nome": "Thor",
  "cidade": "São Paulo, SP",
  "status": "urgente",
  "categoria": ["Cachorros", "Grande Porte"],
  "descricao": "...",
  "imagem": "data:image/...",
  "contato": "(11) 99999-9999",
  "telefone": "11999999999",
  "ownerEmail": "usuario@exemplo.com",
  "ownerUid": "user_id",
  "dataCriacao": "timestamp",
  "dataAtualizacao": "timestamp"
}
```

### Coleção: `reports`
```json
{
  "petId": "pet_id",
  "petName": "Thor",
  "reporterName": "Denunciante",
  "reporterEmail": "denunciante@exemplo.com",
  "motivo": "Palavrões",
  "ownerIdentifier": "usuario@exemplo.com",
  "dataCriacao": "timestamp",
  "resolvida": false
}
```

---

## Contato para Suporte

Se tiver dúvidas sobre a configuração, verifique a documentação do Firebase:
- [Firebase Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
