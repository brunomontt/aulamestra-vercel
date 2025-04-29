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
Você é um especialista em educação com experiência em planos de aula alinhados à BNCC. Gere um plano de aula completo, claro e aplicável, com duração entre 45 e 60 minutos.

Informações:
- Tema: ${tema}
- Série: ${serie}
- Área: ${area}
- Linha pedagógica: ${linha || 'Não Informada'}
- Metodologia: ${metodologia || 'Não Informada'}
- Dificuldade: ${dificuldade || 'Não Informado'}

Estrutura esperada (formate com Markdown usando ## para títulos):

${nome ? `**Professor(a):** ${nome}\n` : ''}
**Tema:** ${tema}  
**Série:** ${serie}  
**Área:** ${area}

## Objetivo Geral  
- Um objetivo principal da aula.

## Objetivos Específicos  
- Liste de 3 a 4 metas claras.

## Metodologia  
- Como aplicar a metodologia indicada.

## Etapas da Aula  
- Divida em 3 a 4 partes com tempo estimado por etapa.

## Atividades Práticas  
- Sugira até 2 atividades com nome e descrição.

## Materiais Necessários  
- Liste materiais em formato de lista.

## Atividade para Casa  
- Proponha uma tarefa simples relacionada.

## Avaliação  
- Critérios claros para avaliar se os objetivos foram alcançados.
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
