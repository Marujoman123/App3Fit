# 🧪 Testes Automatizados - App3fit

## Setup

### 1. Instalar Cypress

```bash
npm install --save-dev cypress
```

### 2. Estrutura de Testes

```
cypress/
├── fixtures/
│   └── users.json          # Dados de teste (3 personas)
├── support/
│   ├── commands.js         # Comandos customizados
│   └── e2e.js             # Setup global
└── e2e/
    ├── 1-login.cy.js      # Testes de Login
    ├── 2-auth.cy.js       # Testes de Auth & Header
    ├── 3-registration.cy.js # Testes de Cadastro
    ├── 4-admin.cy.js      # ⏳ Testes Admin (próximo)
    ├── 5-cliente.cy.js    # ⏳ Testes Cliente (próximo)
    └── 6-parceiro.cy.js   # ⏳ Testes Parceiro (próximo)
```

---

## 🚀 Como Executar

### Opção 1: Interface Gráfica (Recomendado para desenvolvimento)

```bash
npm run cypress:open
```

Depois:
1. Clique em "E2E Testing"
2. Selecione um navegador
3. Escolha um arquivo de teste

### Opção 2: Rodar todos os testes

```bash
npm run cypress:run
```

### Opção 3: Rodar um arquivo específico

```bash
npm run cypress:run -- --spec "cypress/e2e/1-login.cy.js"
```

### Opção 4: Rodar com vídeo

```bash
npm run cypress:run -- --record
```

---

## 📝 Scripts no package.json

Adicione ao seu `package.json`:

```json
{
  "scripts": {
    "cypress:open": "cypress open",
    "cypress:run": "cypress run",
    "test": "cypress run",
    "test:watch": "cypress open"
  }
}
```

---

## ✅ Testes Criados

### 1️⃣ **Login Tests** (`1-login.cy.js`)

#### CPF Input Formatting
- ✅ Formata CPF com máscara enquanto digita
- ✅ Limita a 11 dígitos
- ✅ Remove caracteres não-numéricos

#### Admin (ADMINISTRADOR)
- ✅ Mostra modal de senha para CPF admin
- ✅ Redireciona para admin.html com senha correta
- ✅ Mostra erro com senha incorreta
- ✅ Limpa campo de senha após erro
- ✅ Fecha modal ao clicar cancelar

#### Cliente (CLIENTE)
- ✅ Redireciona para cliente-painel.html
- ✅ Armazena dados corretos em localStorage

#### Parceiro (PARCEIRO)
- ✅ Redireciona para parceiro-painel.html
- ✅ Armazena saldo em localStorage

#### Validação
- ✅ Mostra erro para CPF inválido
- ✅ Mostra erro para CPF incompleto

---

### 2️⃣ **Auth & Header Tests** (`2-auth.cy.js`)

#### Admin Header
- ✅ Exibe nome do admin
- ✅ Não mostra saldo
- ✅ Tem botão de logout
- ✅ Logout funciona corretamente

#### Cliente Header
- ✅ Exibe nome do cliente
- ✅ Não mostra saldo

#### Parceiro Header
- ✅ Exibe nome do parceiro
- ✅ Mostra saldo

#### Session Timeout
- ✅ Faz logout após 3 minutos de inatividade
- ✅ Reseta timeout com atividade do usuário

#### Page Protection
- ✅ Redireciona para login se acessar admin sem auth
- ✅ Redireciona para login se acessar cliente-painel sem auth
- ✅ Redireciona para login se acessar parceiro-painel sem auth

---

### 3️⃣ **Registration Tests** (`3-registration.cy.js`)

#### Form Formatting
- ✅ Pré-preenche CPF da URL
- ✅ Formata telefone com máscara
- ✅ Converte nome para maiúscula

#### Keyboard Navigation
- ✅ Tab entre campos com Enter
- ✅ Submete formulário com Enter no último campo

#### Validação
- ✅ Requer todos os campos
- ✅ Não permite registro sem telefone

#### Registro Bem-sucedido
- ✅ Registra novo cliente
- ✅ Desabilita botão enquanto salva
- ✅ Redireciona para caixa.html

---

## 🔄 Dados de Teste (fixtures/users.json)

### Admin
```json
{
  "cpf": "414.716.138-36",
  "name": "HUGO ROSA",
  "password": "4321"
}
```

### Cliente
```json
{
  "cpf": "458.488.840-05",
  "name": "CLIENTE TESTE",
  "phone": "(11) 99999-9999"
}
```

### Parceiro
```json
{
  "cpf": "996.508.460-26",
  "name": "PARCEIRO RATO",
  "phone": "(21) 98888-8888",
  "balance": "500.00"
}
```

---

## 🛠️ Comandos Customizados

### `cy.loginAsAdmin()`
Faz login como administrador (com senha)

```js
cy.loginAsAdmin();
// Agora está em admin.html
```

### `cy.loginAsCliente()`
Faz login como cliente

```js
cy.loginAsCliente();
// Agora está em cliente-painel.html
```

### `cy.loginAsParceiro()`
Faz login como parceiro

```js
cy.loginAsParceiro();
// Agora está em parceiro-painel.html
```

### `cy.logout()`
Faz logout

```js
cy.logout();
// Volta para index.html
```

### `cy.verifyUserType(type)`
Verifica tipo de usuário em localStorage

```js
cy.verifyUserType('Proprietário');
cy.verifyUserType('Cliente');
cy.verifyUserType('Parceiro');
```

### `cy.verifyHeaderProfile(firstName)`
Verifica se nome está no header

```js
cy.verifyHeaderProfile('HUGO');
```

---

## 📊 Próximos Testes a Criar

### 4️⃣ **Admin Tests** (`4-admin.cy.js`) - ⏳ TODO

- [ ] Criar pedido manual
- [ ] Gerenciar produtos
- [ ] Ver relatório
- [ ] Validar cupom
- [ ] Filtrar por tipo de preço

### 5️⃣ **Cliente Tests** (`5-cliente.cy.js`) - ⏳ TODO

- [ ] Ver estoque
- [ ] Criar pedido
- [ ] Consultar status
- [ ] Fazer pagamento

### 6️⃣ **Parceiro Tests** (`6-parceiro.cy.js`) - ⏳ TODO

- [ ] Ver saldo
- [ ] Criar encomenda
- [ ] Buscar cliente por cupom
- [ ] Gerar PDF de pedido

---

## 🎯 Cobertura Atual

```
Login Page        | ████████████░░░░░░ | 70% (faltam edge cases)
Auth & Header     | ████████████░░░░░░ | 70%
Registration      | ███████████░░░░░░░ | 65%
Admin Dashboard   | ░░░░░░░░░░░░░░░░░░ | 0%
Client Dashboard  | ░░░░░░░░░░░░░░░░░░ | 0%
Partner Dashboard | ░░░░░░░░░░░░░░░░░░ | 0%

Total             | ████░░░░░░░░░░░░░░ | 22%
```

---

## 🐛 Troubleshooting

### Testes falhando por timeout
Aumente o timeout em `cypress.config.js`:
```js
defaultCommandTimeout: 15000  // 15 segundos
```

### Module not found errors
Certifique-se de que está usando Live Server ou outro servidor HTTP.

### localStorage vazio
Cypress limpa localStorage antes de cada teste (see `support/e2e.js`).

---

## 📚 Referência

- [Cypress Docs](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Custom Commands](https://docs.cypress.io/api/cypress-api/custom-commands)

---

**Status:** ✅ Fase 1 Testes Criada | ⏳ Fase 2 Admin/Cliente/Parceiro
