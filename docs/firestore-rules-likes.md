# Regras do Firestore para curtidas

Cole este conteúdo no Firebase Console > Firestore Database > Regras para garantir que cada usuário só possa curtir um post uma vez e que a contagem só possa variar de 1 em 1.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() && (
        request.auth.token.email == 'admin@ajudapet.com' ||
        request.auth.token.email == 'lucas@ajudapet.com'
      );
    }

    function canEditPet() {
      return isSignedIn() && (
        request.auth.uid == resource.data.ownerUid ||
        isAdmin()
      );
    }

    match /users/{userId} {
      allow read: if true;
      allow create, update: if isOwner(userId);
      allow delete: if false;

      match /notifications/{notificationId} {
        allow read: if isOwner(userId);
        allow create: if isSignedIn()
          && request.resource.data.actorUid == request.auth.uid
          && request.resource.data.targetUid == userId
          && request.resource.data.type in ['like', 'follow']
          && request.resource.data.viewed == false
          && request.resource.data.createdAt is timestamp;
        allow update: if isOwner(userId)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewed', 'viewedAt']);
        allow delete: if isOwner(userId);
      }
    }

    match /reports/{reportId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.auth.token.email != null;
    }

    match /pets/{petId} {
      allow read: if true;

      allow create: if isSignedIn()
        && request.resource.data.ownerUid == request.auth.uid;

      allow update: if canEditPet() || (
        isSignedIn() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount']) &&
        (
          (!('likesCount' in resource.data) && request.resource.data.likesCount == 1) ||
          request.resource.data.likesCount == resource.data.likesCount + 1 ||
          request.resource.data.likesCount == resource.data.likesCount - 1
        )
      );

      allow delete: if canEditPet();

      match /likes/{userId} {
        allow read: if true;
        allow create: if isOwner(userId)
          && request.resource.data.userId == request.auth.uid
          && request.resource.data.keys().hasOnly(['userId', 'createdAt'])
          && !exists(/databases/$(database)/documents/pets/$(petId)/likes/$(userId));
        allow delete: if isOwner(userId)
          && exists(/databases/$(database)/documents/pets/$(petId)/likes/$(userId));
      }
    }
  }
}
```

Observações:
- O problema do erro de edição é que a regra antiga só permitia alteração de `likesCount`; a edição completa do pet ficava bloqueada.
- A regra acima permite edição do animal pelo dono do post e por administradores, sem abrir o documento inteiro para qualquer usuário.
- O campo `likesCount` continua protegido para aumentar/decrementar apenas 1 por vez.
- A unicidade real fica garantida pela subcoleção `pets/{petId}/likes/{userId}`.

## Regras do Firestore para seguidores e seguindo

Se a app deve salvar apenas no Firestore e não em localStorage, use uma regra que permita:
- o usuário ler qualquer perfil;
- o usuário alterar apenas o array `following` do próprio documento;
- o usuário alterar apenas o array `followers` do documento do alvo quando estiver seguindo ou deixando de seguir.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidUserFollowList(data) {
      return data is list && data.size() >= 0 && data.every((value) => value is string);
    }

    match /users/{userId} {
      allow read: if true;

      allow update: if isSignedIn() && (
        (
          userId == request.auth.uid &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['following', 'followingUpdatedAt']) &&
          isValidUserFollowList(request.resource.data.following)
        ) || (
          userId != request.auth.uid &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers', 'followersUpdatedAt']) &&
          isValidUserFollowList(request.resource.data.followers)
        )
      );

      allow create: if isOwner(userId);
      allow delete: if false;
    }
  }
}
```

Importante:
- O estado de seguidores/seguindo deve ser calculado a partir do Firestore e exibido em tempo real nos textos e contadores.
- Não use `localStorage` como fonte de verdade para `followers` e `following`.
- A atualização ocorre ao clicar no botão de seguir/deixar de seguir, e o valor é refletido para todos os usuários que consultam o perfil.
