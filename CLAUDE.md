# 🏗️ Arquitetura App3fit

## 📋 Visão Geral

**App3fit** é uma aplicação Cordova + Web que gerencia pedidos e estoque para um sistema de e-commerce. Opera com **zero custos de infraestrutura**:
- **Frontend:** HTML/CSS/JS estático (hospedado no GitHub Pages)
- **Database:** Google Sheets via Google Apps Script
- **Mobile:** Cordova (Android/iOS)
- **Custo:** €0/mês ✅

## 🎯 Restrições Arquiteturais (OBRIGATÓRIAS)

### ✅ SIM - Manter Sempre
- Google Sheets como database
- GitHub Pages para hospedar
- Google Apps Script para API
- HTML/CSS/JS estático no frontend
- Cordova para mobile

### ❌ NÃO - Nunca Adicionar
- Servidores backend (Node.js, Django, etc)
- Bancos de dados pagos (Firebase, Postgres, MongoDB)
- CDNs pagos
- Serviços de terceiros com custo

## 📁 Estrutura de Pastas (Proposta)

```
www/
├── index.html                 # Login
├── admin.html                 # Admin dashboard
├── cliente-painel.html        # Cliente dashboard
├── parceiro-painel.html       # Parceiro dashboard
│
├── js/
│   ├── config.js              # ⭐ Constantes globais (URLs, keys)
│   ├── storage.js             # ⭐ StorageManager (abstração localStorage)
│   ├── api.js                 # ⭐ Chamadas ao Google Apps Script
│   ├── router.js              # ⭐ Navegação centralizada
│   ├── utils.js               # ⭐ Utilitários (format, validate)
│   ├── errorHandler.js        # ⭐ Tratamento de erros
│   │
│   ├── modules/
│   │   ├── auth.js            # Lógica de autenticação
│   │   ├── user.js            # Gerenciamento de usuários
│   │   ├── cart.js            # Lógica de carrinho
│   │   ├── products.js        # Gerenciamento de produtos
│   │   └── orders.js          # Gerenciamento de pedidos
│   │
│   └── pages/
│       ├── index-init.js      # Inicialização login
│       ├── admin-init.js      # Inicialização admin
│       ├── cliente-init.js    # Inicialização cliente
│       └── parceiro-init.js   # Inicialização parceiro
│
├── css/
│   ├── index.css              # Login
│   ├── admin.css              # Admin
│   ├── common.css             # Global
│   └── utilities.css          # Classes utilitárias
│
└── img/
    └── ...
```

## 🔄 Fluxo de Dados

```
┌─────────────────┐
│   Frontend JS   │  (HTML/CSS estático)
└────────┬────────┘
         │ fetch() / axios
         ↓
┌─────────────────────────────────┐
│   Google Apps Script            │  (API REST)
│   (Intermediário)               │
└────────┬────────────────────────┘
         │ googleSheets.appendRow()
         ↓
┌─────────────────┐
│  Google Sheets  │  (Database)
└─────────────────┘
```

## 📡 Padrão de Chamadas à API

**NUNCA fazer**:
```js
// ❌ ERRADO - URL hardcoded em 5 arquivos
const URL = "https://script.google.com/macros/s/ABC123/exec";
fetch(URL + "?cpf=" + cpf);
```

**SEMPRE fazer**:
```js
// ✅ CORRETO - Centralizado
import { API } from './modules/api.js';

API.validarCPF(cpf)
  .then(resultado => {})
  .catch(erro => ErrorHandler.log(erro));
```

## 💾 Padrão de Armazenamento Local

**NUNCA fazer**:
```js
// ❌ ERRADO - Strings mágicas espalhadas
localStorage.setItem('usuario_tipo', 'Parceiro');
const tipo = localStorage.getItem('usuario_tipo');
```

**SEMPRE fazer**:
```js
// ✅ CORRETO - Centralizado
import { Storage } from './storage.js';

Storage.setUserType('Parceiro');
const tipo = Storage.getUserType();
```

## 🔐 Segurança (CRÍTICO)

### ❌ NUNCA Colocar no Código
- CPF/Senhas de admin
- Tokens/Keys privadas
- Dados sensíveis

### ✅ FAZER
- Validar CPF matematicamente no frontend
- Validar senha no backend (Google Apps Script)
- Limpar localStorage ao logout
- Usar localStorage apenas para cache (não dados sensíveis)

## 🎯 Padrões de Código

### 1. Event Listeners
```js
// ✅ CORRETO - Centralizado em função init()
function initEventListeners() {
  document.getElementById('btnEntrar').addEventListener('click', handleLogin);
  document.getElementById('cpfInput').addEventListener('input', handleCPFInput);
}

document.addEventListener('DOMContentLoaded', initEventListeners);
```

### 2. Manipulação de DOM
```js
// ❌ ERRADO
modal.style.display = 'flex';
input.style.backgroundColor = '#f0f0f0';

// ✅ CORRETO - Usar classes CSS
modal.classList.add('modal-visible');
input.classList.add('input-disabled');
```

### 3. Tratamento de Erros
```js
// ❌ ERRADO
alert("Erro!");
console.error("Erro");

// ✅ CORRETO
ErrorHandler.show("Mensagem amigável ao usuário");
ErrorHandler.log("Detalhes técnicos para debug");
```

### 4. Formatação de Dados
```js
// ❌ ERRADO - Lógica espalhada
let cpf = input.value.replace(/\D/g, "");
cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");

// ✅ CORRETO - Função reutilizável
import { formatCPF } from './utils.js';
const cpfFormatado = formatCPF(input.value);
```

## 📦 Fases de Refatoração

### Fase 1: Infraestrutura (1-2 dias)
- [ ] Criar `config.js` com URLs
- [ ] Criar `storage.js` com abstração
- [ ] Criar `api.js` com chamadas
- [ ] Criar `utils.js` com funções comuns
- [ ] Criar `errorHandler.js` com padrão

### Fase 2: Integração (2-3 dias)
- [ ] Refatorar `index.js` (login)
- [ ] Refatorar `auth.js` (autenticação)
- [ ] Remover credenciais hardcoded
- [ ] Integrar infraestrutura

### Fase 3: Modularização (2 dias)
- [ ] Criar módulos em `js/modules/`
- [ ] Refatorar páginas admin/cliente/parceiro
- [ ] Aplicar padrões consistentes

## 🚀 Deploy

### GitHub Pages
```bash
# 1. Push para main
git add .
git commit -m "Refactor: nova arquitetura"
git push origin main

# 2. Ativar GitHub Pages
# Settings > Pages > Source: main > /root
# URL: https://seu-usuario.github.io/App3fit/
```

### Cordova (Mobile)
```bash
# Build para Android
cordova build android

# Instalar em device
cordova run android
```

## 📝 Commitamentos

### Git Workflow
- **Branch principal:** `main` (prod)
- **Branches de feature:** `feat/nome-feature`
- **Padrão de commit:**
  ```
  feat: Criar módulo de autenticação
  refactor: Centralizar URLs da API
  fix: Corrigir validação de CPF
  ```

### Responsabilidades
- **Arquitetura:** Centralizar, abstrair, reutilizar
- **Zero-cost:** Nunca adicionar dependências pagas
- **Segurança:** Validar entrada, proteger dados
- **Manutenibilidade:** Código legível, bem organizado

## 🔗 Recursos Importantes

- Google Apps Script: `https://script.google.com/`
- GitHub Pages: `Settings > Pages`
- Google Sheets: Seu banco de dados
- Cordova Docs: `https://cordova.apache.org/`

## ⚠️ Checklist Pré-Deploy

- [ ] Nenhuma credencial hardcoded
- [ ] URLs apontam para config.js
- [ ] localStorage abstraído via storage.js
- [ ] Erros tratados com ErrorHandler
- [ ] Código testado no Cordova
- [ ] README.md atualizado
- [ ] Comentários em código complexo

---

**Última atualização:** 2026-10-28  
**Status:** Em refatoração - Fase 1
