// Importa a biblioteca node-fetch para fazer requisições HTTP
const fetch = require('node-fetch');

// Handler principal para a função Netlify
exports.handler = async function(event, context) {
    // Verifica se o método HTTP é POST, caso contrário, retorna erro 405
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
        };
    }

    let data;
    try {
        // Tenta fazer o parse do corpo da requisição como JSON
        data = JSON.parse(event.body);
    } catch (error) {
        // Se o parse falhar, retorna erro 400
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Corpo da requisição inválido. Deve ser um JSON válido.' })
        };
    }

    // Desestrutura os dados recebidos
    const { nome, tema, serie, area, linha, metodologia, dificuldade } = data;

    // --- Validação Básica dos Campos Essenciais para o MVP ---
    // Verifica se os campos cruciais estão presentes.
    // Adapte esta lista conforme o que você considera essencial para gerar um plano mínimo.
    if (!tema || !serie || !area) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Campos essenciais faltando: tema, serie e area são obrigatórios.' })
        };
    }
    // Você pode adicionar validações mais específicas aqui se necessário (ex: se tema é uma string não vazia)

    // Monta o prompt para a API da OpenAI
    const prompt = `
Você é um especialista em educação e elaboração de planos de aula alinhados à BNCC.

Com base nas informações abaixo, elabore um plano de aula completo, claro, prático e organizado:
- Nome do Professor: ${nome || 'Não Informado'} {/* Adiciona fallback caso o nome não seja enviado */}
- Tema da Aula: ${tema}
- Série/Ano Escolar: ${serie}
- Área de Conhecimento: ${area}
- Linha Pedagógica: ${linha || 'Não Informada'} {/* Adiciona fallback */}
- Tipo de Metodologia: ${metodologia || 'Não Informada'} {/* Adiciona fallback */}
- Nível de Dificuldade para os Alunos: ${dificuldade || 'Não Informado'} {/* Adiciona fallback */}

Siga exatamente esta estrutura, usando **Markdown** para formatação:
- Use '##' para os títulos das seções (ex: '## Objetivo Geral').
- Use '-' seguido de um espaço para os itens de lista (ex: '- Primeiro item da lista').

---

# Plano de Aula

**Professor(a):** ${nome || 'Não Informado'}
**Tema:** ${tema}
**Série:** ${serie}
**Área de Conhecimento:** ${area}
**Linha Pedagógica:** ${linha || 'Não Informada'}

---

## Fundamentação na BNCC

- Cite qual é a competência geral ou habilidade específica da BNCC que fundamenta conceitualmente esta aula.
- **Nota:** A IA pode tentar indicar códigos, mas foque na descrição do conceito alinhado à BNCC.
- Explique brevemente como a proposta da aula contribui para o desenvolvimento dessa habilidade/competência.

---

## Guia Rápido para o Professor

- Forneça uma explicação resumida sobre o tema da aula.
- Contextualize de maneira prática e aprofundada, oferecendo informações relevantes para apoiar a preparação e a condução da aula.
- Indique 2 ou 3 **tipos** de materiais para estudo prévio (ex: "um livro didático sobre o tema", "um vídeo explicativo", "um artigo científico") que seriam relevantes para o docente, respeitando o nível de formação. **Não invente títulos específicos.**

---

## Objetivo Geral

- Crie 1 ou 2 frases resumindo o objetivo principal da aula.

---

## Objetivos Específicos

- Liste 4 a 5 metas claras para o aprendizado dos alunos. Use formato de lista com '-'.

---

## Metodologia

- Descreva como aplicar a metodologia escolhida, adaptando-a ao tema e à faixa etária indicada.

---

## Roteiro de Condução da Aula

- Escreva como o professor pode conduzir a aula em etapas, como se estivesse dando instruções.
- Divida o tempo sugerido para cada etapa, considerando que o tempo total estimado da aula deve ser de aproximadamente 45 a 60 minutos. Use formato de lista com '-' ou etapas numeradas.

---

## Atividades Práticas

Sugira 3 atividades práticas diferentes baseadas no tema e na área de conhecimento. Para cada atividade, detalhe:
- Nome da atividade
- Breve descrição
- Materiais necessários (se houver)
- Tempo estimado
Use formato de lista com '-' para as atividades e sub-itens.

---

## Materiais Necessários

- Liste os principais materiais que deverão ser preparados com antecedência para as atividades. Use formato de lista com '-'.

---

## Atividade para Casa

- Proponha uma tarefa prática que reforce o conteúdo da aula, adequada ao nível de dificuldade informado.

---

## Critérios de Avaliação

- Sugira como o professor poderá avaliar se os objetivos da aula foram alcançados (ex.: participação ativa, realização das atividades propostas, criatividade, domínio dos conceitos trabalhados etc.). Use formato de lista com '-'.

---

**Observação:**
- Utilize uma linguagem objetiva e clara, adequada à faixa etária indicada.
- Respeite o conhecimento e a experiência do professor, oferecendo orientações de apoio sem simplificações desnecessárias.
- Busque inspirar o professor com sugestões práticas e aplicáveis em sala de aula.
- **Formate toda a resposta usando Markdown, seguindo as instruções de títulos (##) e listas (-).**
`;

    try {
        // Faz a requisição para a API da OpenAI
        const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // Modelo da OpenAI
                messages: [{ role: 'user', content: prompt }], // O prompt enviado para a IA
                temperature: 0.7, // Controla a aleatoriedade da resposta (0.7 é um bom equilíbrio)
                max_tokens: 2500 // Aumentado ligeiramente para acomodar planos mais longos
            })
        });

        // Verifica se a resposta da API da OpenAI foi bem sucedida (status 2xx)
        if (!resposta.ok) {
            const errorBody = await resposta.text(); // Tenta ler o corpo do erro
            console.error('Erro da API OpenAI:', resposta.status, errorBody);
            return {
                statusCode: resposta.status, // Retorna o status de erro da OpenAI
                body: JSON.stringify({ error: `Erro da API OpenAI: ${resposta.statusText}. Detalhes: ${errorBody.substring(0, 200)}...` }) // Inclui detalhes do erro se disponíveis
            };
        }

        // Parseia a resposta JSON da API da OpenAI
        const dataOpenAI = await resposta.json();

        // Verifica se a resposta da OpenAI contém o conteúdo esperado
        if (!dataOpenAI.choices || dataOpenAI.choices.length === 0 || !dataOpenAI.choices[0].message || !dataOpenAI.choices[0].message.content) {
             console.error('Resposta inesperada da API OpenAI:', JSON.stringify(dataOpenAI));
             return {
                 statusCode: 500,
                 body: JSON.stringify({ error: 'Resposta inesperada da API OpenAI. Não foi possível gerar o plano.' })
             };
        }

        // Extrai o conteúdo do plano de aula gerado pela IA
        const planoGerado = dataOpenAI.choices[0].message.content;

        // Retorna o plano de aula para o frontend
        return {
            statusCode: 200,
            // Retorna o plano dentro de um objeto JSON com a chave 'plano'
            body: JSON.stringify({ plano: planoGerado })
        };

    } catch (error) {
        // Captura erros gerais (problemas de rede, etc.)
        console.error('Erro interno do servidor:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocorreu um erro interno ao gerar o plano de aula.' })
        };
    }
};
