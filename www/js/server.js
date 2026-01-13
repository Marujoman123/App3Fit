const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors()); // Isso libera o acesso para o seu HTML

app.get('/meus-terminais', async (req, res) => {
    try {
        const response = await axios.get('https://api.mercadopago.com/terminals/v1/list', {
            params: { limit: 50, offset: 0, store_id: '1235456678' },
            headers: {
                'Authorization': 'Bearer SEU_TOKEN_AQUI',
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));