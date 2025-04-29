const fetch = require('node-fetch');

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
Você é um especialista em educação e elaboração de planos de aula alinhados à BNCC.

Com base nas informações abaixo, elabore um plano de aula completo, claro, prático e organizado. A aula terá entre 45 e 60 minutos de duração.

- Tema da Aula: ${tema}
- Série/Ano Escolar: ${serie}
- Área de Conhecimento: ${area}
- Linha Pedagógica: ${linha || 'Não Informada'}
- Tipo de Metodologia: ${metodologia || 'Não Informada'}
- Nível de Dificuldade para os Alunos: ${dificuldade || 'Não Informado'}

Use linguagem objetiva, acessível e profissional. Use Markdown com '##' para títulos e '-' para listas.

---

# Plano de Aula

${nome ? `**Professor(a):** ${nome}` : ''}
**Tema:** ${tema}  
**Série:** ${serie}  
**Área de Conhecimento:** ${area}  
**Linha Pedagógica:** ${linha || 'Não Informada'}

---

## Fundamentação na BNCC

- Cite a(s) competência(s) da BNCC relacionadas à aula.
- Explique brevemente como a proposta contribui para o desenvolvimento dessas competências.

---

## Guia Rápido para o Professor

- Explique o tema da aula de forma resumida.
- Indique 2 a 3 tipos de materiais que o professor pode consultar antes da aula (ex: livro didático, vídeo explicativo, artigo), sem inventar títulos.

---

## Objetivo Geral

- Resuma o objetivo principal da aula.

---

## Objetivos Específicos

- Liste 4 ou 5 metas claras para o aprendizado dos alunos.

---

## Metodologia

- Descreva como aplicar a metodologia indicada ao tema, considerando a faixa etária.

---

## Roteiro de Condução da Aula

- Divida a aula em etapas, com tempos estimados (total de 45 a 60 minutos).
- Dê orientações práticas como se fosse um passo a passo.

---

## Atividades Práticas

Sugira 3 atividades com:

- Nome da atividade  
- Descrição  
- Materiais necessários  
- Tempo estimado

---

## Materiais Necessários

- Liste os materiais que devem ser preparados com antecedência.

---

## Atividade para Casa

- Proponha uma tarefa prática relacionada ao conteúdo da aula.

---

## Critérios de Avaliação

- Sugira formas de avaliar se os objetivos foram alcançados (ex: participação, criatividade, execução das atividades).

---

**Observação final:**  
Evite termos vagos como "trabalhar o tema". Use verbos de ação e linguagem direta. Crie algo que o professor consiga aplicar amanhã mesmo.
`;

    try {
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
                max_tokens: 2500
            })
        });

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
        console.error('Erro interno do servidor:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocorreu um erro interno ao gerar o plano de aula.' })
        };
    }
};
