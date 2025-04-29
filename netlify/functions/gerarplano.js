const fetch = require('node-fetch');
const AbortController = require('abort-controller');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
        };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Deve ser um JSON válido.' })
        };
    }

    const { nome, tema, serie, area, linha, metodologia, dificuldade } = data;

    if (!tema || !serie || !area) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Campos essenciais faltando: tema, serie e area são obrigatórios.' })
        };
    }

    const prompt = `
Você é um especialista em educação com ampla experiência em criação de planos de aula alinhados à BNCC.

Com base nas informações abaixo, elabore um plano de aula prático, direto e bem estruturado, com duração de 45 a 60 minutos. 

Evite abstrações e frases genéricas como “trabalhar o tema” ou “fomentar discussões”. Use verbos de ação claros como **identificar, analisar, construir, resolver, argumentar, comparar** etc.

Sempre que possível, **varie as sugestões** entre os planos e evite repetir atividades comuns (como “criação de cartazes” ou “jogo dos 3Rs”), a menos que sejam adaptadas de forma criativa e contextualizada.

**Dados informados:**
- Nome do professor: ${nome || 'Não informado'}
- Tema: ${tema}
- Série: ${serie}
- Área do Conhecimento: ${area}
- Linha Pedagógica: ${linha || 'Não informada'}
- Metodologia: ${metodologia || 'Não informada'}
- Nível de Dificuldade: ${dificuldade || 'Não informado'}

---

### Estrutura obrigatória (use Markdown: títulos com "##", listas com "-"):

1. **Tema da Aula**
2. **Objetivo Geral**  
3. **Objetivos Específicos**  
   - Liste metas claras que comecem com verbos de ação.
4. **Conteúdos a serem trabalhados**
5. **Roteiro Detalhado da Aula**
   - Descreva passo a passo, como se estivesse orientando o professor.
   - Indique o tempo estimado de cada etapa.
   - Evite frases vagas como “discussão” ou “explicação teórica”.
6. **Atividades Práticas**
   - Liste 2 ou 3 ideias relevantes e diferentes entre si.
   - Para cada uma, inclua:
     - Nome da atividade
     - Objetivo
     - Materiais necessários
     - Tempo estimado
7. **Materiais Necessários**
8. **Atividade para Casa**
9. **Critérios de Avaliação**
10. **Referência à BNCC**
    - Explique brevemente quais competências gerais da BNCC essa aula desenvolve (sem citar códigos).

---

Use linguagem clara e inspiradora, mas mantenha o foco na aplicabilidade real. A aula deve poder ser usada imediatamente por um professor da educação básica.

---

**Observações finais:**  
- Crie cada plano como se fosse único e pronto para uso.  
- Utilize Markdown com '##' para títulos e '-' para listas.
`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 segundos

        const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1500
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!resposta.ok) {
            const errorBody = await resposta.text();
            console.error('Erro da API OpenAI:', resposta.status, errorBody);
            return {
                statusCode: resposta.status,
                body: JSON.stringify({ error: `Erro da API OpenAI: ${resposta.statusText}. Detalhes: ${errorBody.substring(0, 200)}...` })
            };
        }

        const dataOpenAI = await resposta.json();

        if (!dataOpenAI.choices || !dataOpenAI.choices[0]?.message?.content) {
            console.error('Resposta inesperada da API OpenAI:', JSON.stringify(dataOpenAI));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Resposta inesperada da API OpenAI. Não foi possível gerar o plano.' })
            };
        }

        const planoGerado = dataOpenAI.choices[0].message.content;

        return {
            statusCode: 200,
            body: JSON.stringify({ plano: planoGerado })
        };
    } catch (error) {
        console.error('Erro interno:', error.message || error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno ou tempo limite excedido ao gerar o plano.' })
        };
    }
};
