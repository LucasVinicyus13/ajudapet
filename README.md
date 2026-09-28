<div align="center">

# 🐾 AjudaPet

### Plataforma Web para Divulgação e Adoção de Animais

Projeto desenvolvido como trabalho escolar do curso de **Desenvolvimento de Sistemas** do **Colégio Estadual Barbosa Ferraz**.

<a href="https://ajudapet-blush.vercel.app/">🌐 Acessar Projeto</a> •
<a href="https://github.com/LucasVinicyus13/ajudapet">📁 Repositório</a>

</div>

---

# 📖 Sobre o Projeto

O **AjudaPet** é uma plataforma web criada com o objetivo de facilitar a divulgação de animais em situação de rua ou disponíveis para adoção.

A plataforma permite que qualquer usuário publique animais que necessitam de ajuda, enquanto outras pessoas podem visualizar as publicações, entrar em contato diretamente com o responsável e contribuir para que esses animais encontrem um novo lar.

O projeto busca utilizar a tecnologia como ferramenta de impacto social, aproximando pessoas interessadas em ajudar animais abandonados.

---

# 🎯 Objetivos

- Incentivar a adoção responsável.
- Facilitar a divulgação de animais em situação de risco.
- Aproximar tutores e possíveis adotantes.
- Disponibilizar uma plataforma simples, rápida e intuitiva.
- Promover o bem-estar animal através da tecnologia.

---

# ✨ Funcionalidades

- ✅ Cadastro de usuários
- ✅ Login utilizando Firebase Authentication
- ✅ Publicação de animais com imagem, localização, categorias e status
- ✅ Feed com detalhes, curtidas e compartilhamento de posts
- ✅ Filtros por porte, espécie, categoria geral e fase de vida
- ✅ Explicações sobre as categorias e os status dos animais
- ✅ Contato com responsáveis pelo WhatsApp e denúncia de publicações
- ✅ Perfil próprio para gerenciar posts e marcá-los como adotados
- ✅ Perfis públicos com posts e contadores de seguidores, seguindo e publicações
- ✅ Ações para seguir usuários e consultar listas de seguidores e seguindo
- ✅ Interface responsiva para celulares e computadores
- ✅ Integração com Firebase Authentication, Firestore e Storage

---

# 🖥️ Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Vercel

---

# 📷 Capturas de Tela

## Página Inicial

<img src="docs/home.png" width="900">

---

## Publicação de Animal

<img src="docs/publicar.png" width="900">

---

## Tela de Login

<img src="docs/login.png" width="900">

---

# 📂 Estrutura do Projeto

```text
ajudapet/
├── assets/             # Imagens e recursos visuais
├── css/style.css       # Estilos do site
├── docs/               # Documentação complementar
├── js/                 # Aplicação, autenticação e utilitários
├── pages/              # Login, cadastro, perfis e posts
├── index.html          # Página inicial e feed
├── configurar.html     # Orientações para regras do Firestore
└── README.md
```

---

# 🚀 Como Executar

Clone o repositório:

```bash
git clone https://github.com/LucasVinicyus13/ajudapet.git
```

Entre na pasta:

```bash
cd ajudapet
```

Inicie um servidor local na raiz do projeto:

```bash
python3 -m http.server 8000
```

Acesse http://localhost:8000 no navegador. Também é possível usar a extensão **Live Server** do Visual Studio Code.

## Testes

Execute os testes dos utilitários com Node.js:

```bash
node --test js/pet-utils.test.js
```

---

# ☁️ Hospedagem

O projeto encontra-se hospedado na plataforma **Vercel**.

**Deploy**

https://ajudapet-blush.vercel.app/

---

# 📚 Informações Acadêmicas

**Instituição**

Colégio Estadual Barbosa Ferraz

**Curso**

Desenvolvimento de Sistemas

**Turma**

3º A

**Professor Orientador**

Mateus Barbosa Reck

**Ano**

2026

---

# 👨‍💻 Desenvolvedor

**Lucas Vinicyus Sanches Anacleto**

GitHub

https://github.com/LucasVinicyus13

---

# 💡 Melhorias Futuras

- Pesquisa avançada por localização
- Sistema de favoritos
- Chat interno entre usuários
- Painel administrativo
- Histórico de adoções
- Sistema de avaliação dos adotantes
- Notificações em tempo real

---

# ❤️ Agradecimentos

Agradeço ao professor **Mateus Barbosa Reck**, ao **Colégio Estadual Barbosa Ferraz** e a todos que contribuíram para o desenvolvimento deste projeto.

---

<div align="center">

### 🐶 Adotar é um ato de amor.

Se este projeto foi útil para você, deixe uma ⭐ no repositório.

<img src="assets/images/AjudaPet.png" width="500">

</div>
