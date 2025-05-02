const fetch = require('node-fetch');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { nome, tema, serie, area, metodologia } = req.body || {};

    if (!tema || !serie || !area) {
        return res.status(400).json({ error: 'Campos essenciais faltando: tema, serie e area são obrigatórios.' });
    }

        const prompt = `
Você é um especialista em educação com ampla experiência na elaboração de planos de aula alinhados à BNCC.

Sua missão é criar um plano de aula claro, aplicável e inspirador para professores da educação básica, com duração entre 45 e 60 minutos. Siga rigorosamente as instruções abaixo.

---

### 📌 Dados informados pelo usuário:
- Nome do professor: ${nome || 'Não informado'}
- Tema: ${tema}
- Série/Ano: ${serie}
- Área do conhecimento: ${area}
- Metodologia: ${metodologia || 'Não informada'}

## ⚠️ Importante:
1. **Verifique a coerência do tema informado**. Caso pareça fictício, incorreto ou mal formulado, corrija ou adapte antes de continuar o plano.
2. Use linguagem objetiva, evite frases genéricas como “trabalhar o tema” ou “discutir com os alunos”.
3. Prefira verbos de ação como: identificar, comparar, resolver, elaborar, argumentar.
4. Evite repetir atividades comuns como “criação de cartazes” ou “jogo dos 3Rs” — a não ser que traga **variações criativas**.
5. Seja original a cada plano, mesmo que o tema seja parecido com outros.

---

## Estrutura da Resposta (Use Markdown com ## para títulos e - para listas):

1. **Tema da Aula**
2. **Objetivo Geral**
3. **Objetivos Específicos**
   - Liste verbos de ação claros.
4. **Conteúdos a serem Trabalhados**
5. **Contextualização para o Professor**
   - Escreva um texto explicativo robusto (mínimo 2 a 3 parágrafos) que contextualize o tema, seus conceitos principais e sua relevância.
   - O texto deve ser suficientemente claro e informativo para que o professor possa:
     - usar como apoio para si próprio, ou
     - ler diretamente em sala ou projetar no quadro para os alunos.
6. **Roteiro Detalhado da Aula (com tempo estimado)**
   - Descreva o passo a passo.
   - Oriente o que o professor pode falar, fazer, propor.
7. **Atividades**
   - Se fizer sentido, proponha atividades práticas.
   - Se for mais adequado ao tema, sugira uma lista de no mínimo 4 exercícios relacionados ao tema.
   - Para cada proposta (atividade ou exercício), indique:
     - Nome ou título
     - Objetivo
     - Materiais necessários (se houver)
     - Tempo estimado
8. **Materiais Necessários para Aula**
9. **Atividade para Casa**
10. **Critérios de Avaliação**
11. **O que Evitar**
    - Liste armadilhas ou erros comuns do tema (ex: confundir estilo artístico, aplicar conceito errado etc.)
12. **Referência à BNCC**
    - Cite qual competência geral é estimulada (sem código, apenas explicação).


`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.6,
                max_tokens: 1200
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!resposta.ok) {
            const errorBody = await resposta.text();
            console.error('Erro da API OpenAI:', resposta.status, errorBody);
            return res.status(resposta.status).json({ error: `Erro da API OpenAI: ${resposta.statusText}` });
        }

        const data = await resposta.json();
        const plano = data.choices[0]?.message?.content;

        if (!plano) {
            return res.status(500).json({ error: 'Erro ao obter o conteúdo da IA.' });
        }

        return res.status(200).json({ plano });

    } catch (error) {
        console.error('Erro interno:', error.message || error);
        return res.status(500).json({ error: 'Erro interno ou timeout ao gerar o plano.' });
    }
}






