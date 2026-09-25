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
