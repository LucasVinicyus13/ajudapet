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
      allow create: if false;
      allow update: if isSignedIn()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount'])
        && (
          (!('likesCount' in resource.data) && request.resource.data.likesCount == 1) ||
          request.resource.data.likesCount == resource.data.likesCount + 1 ||
          request.resource.data.likesCount == resource.data.likesCount - 1
        );
      allow delete: if false;

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
- A unicidade real fica garantida pela subcoleção `pets/{petId}/likes/{userId}`.
- O campo `likesCount` só pode ser incrementado ou decrementado em 1 para evitar manipulação direta do navegador.
- O callback do frontend usa o documento único por usuário para impedir curtidas duplicadas.
