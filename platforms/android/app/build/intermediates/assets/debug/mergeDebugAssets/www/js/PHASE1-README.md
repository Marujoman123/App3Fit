# 🚀 FASE 1: REFATORAÇÃO CONCLUÍDA

## ✅ O que foi criado

Seis arquivos **reutilizáveis** que centralizam toda a lógica da aplicação:

### 1. **config.js**
- URL do Google Apps Script (centralizada)
- Constantes de ambiente (PROD/DEV)
- Timeouts
- Tipos de usuário
- Páginas da aplicação
- Credenciais (REMOVER DEPOIS)

**Como usar:**
```js
import CONFIG from './config.js';
console.log(CONFIG.API.URL);
console.log(CONFIG.TIMEOUTS.SESSION);
```

---

### 2. **storage.js**
- Abstração completa do `localStorage`
- Sem "strings mágicas" espalhadas
- Métodos para: usuário, carrinho, pagamento, etc

**Como usar:**
```js
import Storage from './storage.js';
Storage.setUserName('João');
const nome = Storage.getUserName();
Storage.clearUserData();
```

---

### 3. **api.js**
- Todas as chamadas ao Google Apps Script centralizadas
- Métodos por domínio (auth, products, payment, etc)
- Tratamento de erros integrado

**Como usar:**
```js
import { API } from './api.js';
const resultado = await API.validateCPF('123.456.789-00');
const produtos = await API.getAllProducts();
```

---

### 4. **utils.js**
- 20+ funções utilitárias reutilizáveis
- Formatação (CPF, phone, currency)
- Validação (CPF, email, phone)
- Cálculos com precisão (arredondamento)
- Arrays, strings, datas

**Como usar:**
```js
import { formatCPF, isValidCPF, roundValue } from './utils.js';
const cpfFormatado = formatCPF('12345678900');
if (isValidCPF(cpf)) { ... }
```

---

### 5. **errorHandler.js**
- Tratamento de erros consistente
- Log para console (debug)
- Mensagens amigáveis ao usuário
- Toast/notificações

**Como usar:**
```js
import { ErrorHandler } from './errorHandler.js';
ErrorHandler.show('Erro ao carregar produtos');
ErrorHandler.log('Detalhes técnicos:', error);
```

---

### 6. **router.js**
- Toda navegação centralizada
- Sem `window.location.href` espalhado
- Logout, back to panel, ir para cadastro, etc
- Query string helpers

**Como usar:**
```js
import { Router } from './router.js';
Router.goToAdmin();
Router.backToPanel();
Router.logout();
const cpf = Router.getParam('cpf');
```

---

## 📝 Exemplo de Refatoração

Veja o arquivo **`index-refactored-example.js`** para um exemplo completo de como refatorar o login usando todos esses módulos.

**Principais mudanças:**
- ❌ Remover `const URL_SCRIPT = "..."`
- ❌ Remover `localStorage.getItem('usuario_tipo')`
- ✅ Usar `API.validateCPF(cpf)`
- ✅ Usar `Storage.setUserType(tipo)`
- ✅ Usar `Router.goToAdmin()`
- ✅ Usar `ErrorHandler.show('Mensagem')`

---

## 🔄 Próximos Passos (Fase 2)

### 1. **Refatorar index.js**
Começar com a página de login (mais simples)
```bash
# Backup
cp www/js/index.js www/js/index.js.backup

# Refatorar usando index-refactored-example.js como referência
```

### 2. **Refatorar auth.js**
Depois a autenticação

### 3. **Remover credenciais hardcoded**
- [ ] Remover `CPF_JE` e `CPF_HUGO` de config.js
- [ ] Remover `SENHA_ADMIN` de config.js
- [ ] Mover para backend seguro (Google Apps Script)

### 4. **Testar**
- [ ] Testar login no navegador
- [ ] Testar no Cordova (Android)
- [ ] Verificar console para erros

---

## 🎯 Padrões a Seguir

### ❌ NUNCA MAIS fazer:
```js
// Errado
const URL_SCRIPT = "https://script.google.com/...";
localStorage.setItem('usuario_tipo', 'Parceiro');
window.location.href = "admin.html";
alert("Erro!");
```

### ✅ SEMPRE fazer:
```js
// Correto
import CONFIG from './config.js';
import Storage from './storage.js';
import { Router } from './router.js';
import { ErrorHandler } from './errorHandler.js';

API.validateCPF(cpf);
Storage.setUserType(CONFIG.USER_TYPES.PARCEIRO);
Router.goToAdmin();
ErrorHandler.show('Erro ao carregar');
```

---

## 📦 Estrutura Atual

```
www/js/
├── config.js ✅ NOVO
├── storage.js ✅ NOVO
├── api.js ✅ NOVO
├── utils.js ✅ NOVO
├── errorHandler.js ✅ NOVO
├── router.js ✅ NOVO
├── index-refactored-example.js ✅ NOVO (exemplo)
├── PHASE1-README.md ✅ NOVO (este arquivo)
│
├── index.js ⏳ REFATORAR FASE 2
├── auth.js ⏳ REFATORAR FASE 2
├── admin-pedidos.js ⏳ REFATORAR FASE 3
├── admin-produtos.js ⏳ REFATORAR FASE 3
├── cadastro.js ⏳ REFATORAR FASE 3
├── caixa.js ⏳ REFATORAR FASE 3
├── clientes-pedidos.js ⏳ REFATORAR FASE 3
├── pagamento.js ⏳ REFATORAR FASE 3
├── parceiro-encomendas.js ⏳ REFATORAR FASE 3
├── parceiro-pedidos.js ⏳ REFATORAR FASE 3
└── relatorio.js ⏳ REFATORAR FASE 3
```

---

## 💡 Tips

1. **Use VS Code Search & Replace** para atualizar imports em massa
2. **Teste cada arquivo** após refatorar
3. **Mantenha o .backup** até ter certeza
4. **Commit frequente** no Git

---

## 🔗 Documentação

- [CLAUDE.md](../CLAUDE.md) - Arquitetura completa
- [config.js](./config.js) - Constantes
- [index-refactored-example.js](./index-refactored-example.js) - Exemplo prático

---

**Status:** ✅ Fase 1 Concluída  
**Próximo:** Refatorar index.js (Fase 2)
