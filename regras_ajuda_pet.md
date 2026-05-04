# REGRAS DE NEGÓCIO — APLICATIVO AJUDAPET

---

## VISÃO GERAL
O AjudaPet é um aplicativo mobile-first que permite a publicação de animais em situação de rua para facilitar resgate, ajuda e adoção.

O foco principal do sistema é reduzir o tempo entre visualizar um animal e tomar uma ação real.

---

# FRONT-END (HTML, CSS, JAVASCRIPT)

## 1. ESTRUTURA PRINCIPAL

O front-end deve ser simples, rápido e direto.

### Telas obrigatórias:
- Login
- Registro
- Home (Feed)
- Detalhes do animal

---

## 2. HOME (FEED)

### Regras:
- Exibir lista de animais cadastrados
- Cada animal deve conter:
  - Imagem
  - Cidade
  - Status
  - Botão "AJUDAR"

### Status possíveis:
- "urgente"
- "resgate"
- "adotado"

### Regra de prioridade:
- Animais "urgente" devem aparecer primeiro

---

## 3. BOTÃO AJUDAR

### Regra principal:
- Deve abrir o WhatsApp com mensagem automática

### Exemplo de função:
```js
// Função responsável por abrir o WhatsApp com mensagem automática
function ajudarPet(telefone) {
  const mensagem = "Olá, vi o animal no AjudaPet e quero ajudar.";
  window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`);
}
```

---

## 4. TELA DE DETALHES DO ANIMAL

### Deve conter:
- Imagem
- Descrição
- Localização
- Status
- Botão "FALAR COM RESPONSÁVEL"

### Regra:
- O botão deve reutilizar a função de WhatsApp

---

## 5. DADOS (FRONT-END INICIAL)

### Estrutura padrão:
```js
// Estrutura base de um animal
const pet = {
  id: 1,
  nome: "Sem nome",
  cidade: "Ivaiporã",
  descricao: "Encontrado na rua",
  status: "urgente",
  imagem: "img.jpg",
  telefone: "44999999999"
};
```

---

## 6. REGRA DE INTERFACE

- Mobile-first obrigatório
- Botões grandes e visíveis
- Ação principal sempre destacada
- Evitar excesso de elementos

---

# BACK-END (FIREBASE)

## 1. ESTRUTURA DO BANCO (FIRESTORE)

### Coleção: pets

Cada documento deve conter:

```json
{
  "nome": "Sem nome",
  "cidade": "Ivaiporã",
  "descricao": "Encontrado na rua",
  "status": "urgente",
  "imagem": "url",
  "telefone": "44999999999",
  "dataCriacao": "timestamp"
}
```

---

## 2. REGRAS DE VALIDAÇÃO

### Ao criar um pet:
- imagem é obrigatória
- telefone é obrigatório
- cidade é obrigatória
- status deve ser válido

---

## 3. REGRAS DE SEGURANÇA (FIREBASE)

### Exemplo:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pets/{petId} {
      allow read: if true;
      allow create: if request.resource.data.telefone != null;
      allow update: if true;
      allow delete: if false;
    }
  }
}
```

---

## 4. FUNÇÕES BACK-END (CONCEITO)

### Criar pet
```js
// Função para adicionar um novo pet no banco
async function criarPet(dados) {
  // Validações básicas
  if (!dados.telefone) throw "Telefone obrigatório";

  // Envia para o Firebase
  await db.collection("pets").add(dados);
}
```

---

### Listar pets
```js
// Função para buscar todos os pets
async function listarPets() {
  const snapshot = await db.collection("pets").get();
  return snapshot.docs.map(doc => doc.data());
}
```

---

### Atualizar status
```js
// Função para atualizar o status do animal
async function atualizarStatus(id, novoStatus) {
  await db.collection("pets").doc(id).update({
    status: novoStatus
  });
}
```

---

## 5. REGRA DE NEGÓCIO PRINCIPAL

O sistema deve sempre facilitar a ação do usuário.

### Prioridade:
1. Visualizar animal
2. Entender situação
3. Entrar em contato rapidamente

Se qualquer etapa tiver fricção, o sistema falha.

---

## 6. REGRAS FUTURAS (NÃO IMPLEMENTAR AGORA)

- Sistema de chat interno
- Stories (PetClips)
- Perfil de usuário
- Sistema de seguidores

---

## REGRA FINAL

Se uma funcionalidade não ajuda diretamente a conectar uma pessoa a um animal, ela não deve ser prioridade.

---

