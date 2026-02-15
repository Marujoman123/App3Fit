🚀 Portal do Parceiro - 3FIT
Este é o ambiente exclusivo para parceiros da 3FIT. O portal foi projetado para ser leve, rápido e funcional, permitindo que o parceiro gerencie suas compras, realize pedidos para clientes finais e consulte o estoque em tempo real.

📁 Estrutura da Branch
Esta branch contém apenas os arquivos necessários para a operação do parceiro, utilizando o núcleo de lógica (JS) compartilhado com o sistema administrativo.


/ (raiz)
├── index.html              # Tela de Login (Acesso unificado)
├── painel-parceiro.html    # Dashboard principal do parceiro
├── parceiros-pedido.html   # Sistema de criação de pedidos e geração de PDF
├── css/
│   └── style.css           # Estilização global
└── js/
    ├── login.js            # Lógica de autenticação e redirecionamento
    └── parceiros-pedido.js # Inteligência de estoque e PDF



🛠️ Funcionalidades Principais
Login Inteligente: O sistema identifica automaticamente se o usuário é um Parceiro e o direciona para o painel correto.

Fazer Compra: Atalho para o fluxo de checkout rápido (utilizando o sistema de caixa existente).

Criar Pedido: Permite montar um carrinho com preços de Parceiro ou Cliente Comum e gerar um PDF profissional para envio via WhatsApp ou E-mail.

Consulta de Estoque: Integração direta com a planilha Google via API, garantindo que o parceiro nunca venda produtos esgotados.

⚙️ Configuração e Sincronização
Integração com Google Sheets (Apps Script)
O sistema consome os dados de uma API desenvolvida no Google Apps Script. Para garantir o funcionamento:

Certifique-se de que a constante URL_SCRIPT nos arquivos JS aponte para a implantação mais recente do seu script.

A implantação no Google deve estar configurada para acesso por "Qualquer pessoa".

Compartilhamento de Código
Esta branch utiliza os arquivos login.js e o CSS global. Qualquer alteração na lógica de precificação ou regras de negócio no core do sistema deve ser replicada aqui para manter a paridade.

🚀 Como Hospedar
Como o projeto é estático (HTML/JS/CSS), ele pode ser hospedado gratuitamente em:

GitHub Pages: Ideal para manter a branch portal-parceiros online com um domínio .github.io.

Netlify / Vercel: Basta conectar o repositório e selecionar esta branch específica.

🔐 Segurança
O acesso às páginas é protegido por uma verificação de localStorage. Se um usuário tentar acessar o painel sem um usuario_tipo válido (Parceiro ou Admin), ele será automaticamente redirecionado para a página de login.

📄 Licença
Uso restrito para parceiros autorizados da 3FIT.

Dica para o GitHub:
Ao subir este arquivo, o GitHub o exibirá automaticamente na página inicial da sua Branch. Isso ajuda muito a manter a organização, especialmente se você for trabalhar com outros desenvolvedores no futuro.