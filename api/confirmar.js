const { Octokit } = require('@octokit/rest');

module.exports = async (req, res) => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.VERCEL_GIT_REPO_OWNER;
    const repo = process.env.VERCEL_GIT_REPO_SLUG;
    const branch = 'main'; // ou 'master'

    try {
        // --- ROTA PARA ADICIONAR PRESENÇA ---
        if (req.method === 'POST') {
            const { nome, foto } = req.body;
            if (!nome || !foto) return res.status(400).json({ message: 'Nome e foto são obrigatórios.' });

            // 1. Faz o upload da imagem
            const nomeArquivoFoto = `fotos-confirmados/${Date.now()}-${nome.replace(/\s+/g, '-')}.png`;
            await octokit.repos.createOrUpdateFileContents({
                owner, repo, path: nomeArquivoFoto, branch,
                message: `[API] Adiciona foto de ${nome}`,
                content: foto,
                encoding: 'base64',
            });

            // 2. Atualiza o JSON de confirmados
            const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: 'confirmados.json', branch });
            const confirmados = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
            
            if (!confirmados.some(p => p.nome === nome)) {
                confirmados.push({ nome, fotoUrl: nomeArquivoFoto });
                await octokit.repos.createOrUpdateFileContents({
                    owner, repo, path: 'confirmados.json', branch, sha: fileData.sha,
                    message: `[API] Confirma presença de ${nome}`,
                    content: Buffer.from(JSON.stringify(confirmados, null, 2)).toString('base64'),
                });
            }
            return res.status(200).json({ message: 'Presença confirmada com sucesso!' });
        }

        // --- ROTA PARA REMOVER PRESENÇA ---
        else if (req.method === 'DELETE') {
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ message: 'Nome é obrigatório.' });

            // 1. Pega o arquivo JSON atual
            const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: 'confirmados.json', branch });
            const confirmados = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));

            const pessoaParaRemover = confirmados.find(p => p.nome === nome);
            if (!pessoaParaRemover) return res.status(404).json({ message: 'Pessoa não encontrada na lista de confirmados.' });

            // 2. Deleta o arquivo da foto
            const { data: fotoData } = await octokit.repos.getContent({ owner, repo, path: pessoaParaRemover.fotoUrl, branch });
            await octokit.repos.deleteFile({
                owner, repo, path: pessoaParaRemover.fotoUrl, branch, sha: fotoData.sha,
                message: `[API] Remove foto de ${nome}`,
            });

            // 3. Atualiza o JSON sem a pessoa
            const novosConfirmados = confirmados.filter(p => p.nome !== nome);
            await octokit.repos.createOrUpdateFileContents({
                owner, repo, path: 'confirmados.json', branch, sha: fileData.sha,
                message: `[API] Cancela presença de ${nome}`,
                content: Buffer.from(JSON.stringify(novosConfirmados, null, 2)).toString('base64'),
            });

            return res.status(200).json({ message: 'Presença cancelada com sucesso.' });
        }
        
        // --- MÉTODO NÃO PERMITIDO ---
        else {
            res.setHeader('Allow', ['POST', 'DELETE']);
            return res.status(405).end(`Método ${req.method} não é permitido.`);
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
    }
};