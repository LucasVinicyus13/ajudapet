# ⚠️ SOLUÇÃO RÁPIDA - Erro de Denúncia

## O Erro é: "Missing or insufficient permissions"

Isso significa que **as regras do Firestore NÃO estão permitindo a criação de denúncias**.

---

## ✅ Solução em 5 Passos

### 1️⃣ Abra o Firebase Console
- Acesse: https://console.firebase.google.com
- Selecione o projeto **ajudapet-2d3c6**

### 2️⃣ Vá para Firestore Rules
- No painel esquerdo, clique em **Firestore Database**
- Clique na aba **Regras**

### 3️⃣ Copie as Novas Regras
Copie TODO o código abaixo:

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

### 4️⃣ Cole as Regras no Firebase Console
1. Delete TODO o conteúdo que está na caixa de regras
2. Cole o código acima
3. Clique em **"Publicar"** (NÃO é Draft!)

⚠️ **IMPORTANTE**: Você DEVE clicar em **"Publicar"**, não "Salvar como rascunho"!

### 5️⃣ Espere e Teste
1. Aguarde 30 segundos para as regras serem ativadas
2. Recarregue a página do AjudaPet (F5)
3. Teste novamente a denúncia

---

## 🧪 Verificar se Funcionou

Se ainda não funcionar, teste aqui: `/teste-denuncia.html`

1. Faça login
2. Abra: `http://seu-site/teste-denuncia.html`
3. Clique em "Testar Denúncia Agora"
4. Você verá exatamente qual é o erro

---

## ⏱️ Quanto Tempo Leva?

- Publicar as regras: 1-2 minutos
- Regras entrarem em vigor: 30 segundos
- Total: **cerca de 2-3 minutos**

---

## 🎯 Resumo das Regras

| Ação | Quem pode | Onde |
|---|---|---|
| Criar denúncia | Qualquer usuário logado | `/reports` |
| Ler denúncia | Apenas admin | `/reports` |
| Editar denúncia | Apenas admin | `/reports` |
| Deletar denúncia | Apenas admin | `/reports` |

---

## ❓ Ainda não funciona?

Se o erro persistir após publicar as regras:

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche completamente o navegador
3. Reabra o navegador
4. Faça login novamente
5. Tente criar uma denúncia

---

## 📞 Última Opção

Se nada funcionar, verifique:

1. **Você tem permissão para editar regras?**
   - Você é o dono do projeto no Firebase?
   - Ou tem a função "Editor" no Firebase?

2. **Está no projeto correto?**
   - Verificar projeto: `ajudapet-2d3c6`
   - Na página do Firestore, o nome do projeto aparece no topo

3. **As regras foram publicadas?**
   - Se vir "rascunho" em vez de "Publicado", clique em Publicar
   - Aguarde a confirmação

---

## ✅ Quando funcionar, você verá:

- ✅ "Denúncia registrada com sucesso!"
- ✅ O cliente de e-mail abre automaticamente
- ✅ No Console (F12): "✅ Denúncia registrada com ID: ..."

Isso significa que tudo está funcionando! 🎉
