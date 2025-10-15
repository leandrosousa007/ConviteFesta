const { Octokit } = require('@octokit/rest');

// Esta função será executada pelo Vercel
module.exports = async (req, res) => {
    // Só aceita requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido.' });
    }

    const { nome, foto } = req.body;

    if (!nome || !foto) {
        return res.status(400).json({ message: 'Nome e foto são obrigatórios.' });
    }

    // Configuração do GitHub - NUNCA COLOQUE A CHAVE DIRETO NO CÓDIGO
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.VERCEL_GIT_REPO_OWNER;
    const repo = process.env.VERCEL_GIT_REPO_SLUG;
    const branch = 'main'; // ou 'master'

    try {
        // 1. Fazer o upload da imagem para uma pasta no repositório
        const nomeArquivoFoto = `fotos-confirmados/${Date.now()}-${nome.replace(/\s+/g, '-')}.png`;
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: nomeArquivoFoto,
            message: `[API] Adiciona foto de ${nome}`,
            content: foto, // A foto já vem em base64
            encoding: 'base64',
            branch
        });

        // 2. Ler o arquivo confirmados.json existente
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'confirmados.json',
            branch
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const confirmados = JSON.parse(content);

        // 3. Adicionar o novo convidado (se ele já não estiver na lista)
        if (!confirmados.some(p => p.nome === nome)) {
            confirmados.push({
                nome: nome,
                fotoUrl: nomeArquivoFoto
            });

            // 4. Salvar o arquivo confirmados.json atualizado
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: 'confirmados.json',
                message: `[API] Confirma presença de ${nome}`,
                content: Buffer.from(JSON.stringify(confirmados, null, 2)).toString('base64'),
                sha: fileData.sha, // SHA é necessário para atualizar um arquivo existente
                branch
            });
        }

        res.status(200).json({ message: 'Presença confirmada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao processar sua confirmação.', error: error.message });
    }
};