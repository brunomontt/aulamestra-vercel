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
Você é um especialista em educação com ampla experiência na criação de planos de aula alinhados à BNCC.

Com base nas informações abaixo, elabore um plano de aula prático, claro e viável para professores da educação básica. A aula terá duração entre 45 e 60 minutos.

Use linguagem acessível e profissional. Utilize parágrafos curtos e listas. **Evite frases genéricas** como "trabalhar o tema", "debater com os alunos" ou "contextualizar o conteúdo". Prefira verbos de ação específicos como **identificar, comparar, resolver, elaborar, criar** etc.

Sempre que possível, **varie as sugestões** entre os planos (não repita ideias comuns como “jogo dos 3Rs” ou “criação de cartazes”, a menos que sejam adaptados de forma original).

**Informações fornecidas:**
- Nome do professor: ${nome}
- Tema: ${tema}
- Série ou Ano Escolar: ${serie}
- Área do Conhecimento: ${area}
- Linha Pedagógica: ${linha}
- Metodologia: ${metodologia}
- Nível de Dificuldade: ${dificuldade}

---

**Formato obrigatório da resposta (em Markdown):**

1. **Tema da Aula**  
2. **Objetivo Geral**  
3. **Objetivos Específicos**  
4. **Conteúdos a serem trabalhados**  
5. **Roteiro Detalhado da Aula (com tempo estimado)**  
    - Descreva passo a passo como o professor pode conduzir a aula.
    - Escreva o que ele deve dizer, perguntar, propor.
    - Evite frases vagas como "explicação teórica".
6. **Atividades Práticas**
    - Dê 2 a 3 ideias originais e criativas, com:
      - Nome da atividade
      - Descrição
      - Materiais necessários
      - Tempo estimado
7. **Materiais Necessários**
    - Liste tudo que o professor deve preparar antes da aula.
8. **Atividade para Casa**
    - Proponha algo útil, realista e conectado ao tema da aula.
9. **Critérios de Avaliação**
    - Indique formas claras de verificar se os objetivos foram atingidos.
10. **Referência à BNCC**
    - Explique brevemente quais habilidades ou competências gerais da BNCC essa aula promove.
    - **Não cite códigos da BNCC.**

---

**Observações finais:**  
- Evite repetições entre planos.  
- Crie cada plano como se fosse único e pronto para uso no dia seguinte.  
- Utilize Markdown com '##' para títulos e '-' para listas.
`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8 segundos

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
