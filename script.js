document.addEventListener('DOMContentLoaded', () => {
    // Telas
    const telaVerificacao = document.getElementById('tela-verificacao');
    const telaConvite = document.getElementById('tela-convite');
    const modalFoto = document.getElementById('modal-foto');

    // Botões e Inputs
    const btnVerificar = document.getElementById('btn-verificar');
    const inputNome = document.getElementById('input-nome');
    const btnFecharModal = document.querySelector('.fechar-modal');
    const inputFoto = document.getElementById('input-foto');
    const previewFoto = document.getElementById('preview-foto');
    const btnAcaoPresenca = document.getElementById('btn-acao-presenca'); // Botão principal
    const btnEnviarConfirmacao = document.getElementById('btn-enviar-confirmacao');
    
    // Elementos de display
    const msgErro = document.getElementById('msg-erro');
    const containerConfirmados = document.getElementById('container-confirmados');

    // Variáveis de estado
    let nomeVerificado = '';
    let arquivoFoto = null;
    let listaDeConvidados = [];

    // --- FUNÇÕES AUXILIARES ---

    // Função para capitalizar a primeira letra de cada nome
    const capitalizarNomes = (str) => {
        return str.toLowerCase().split(' ').map(palavra => 
            palavra.charAt(0).toUpperCase() + palavra.slice(1)
        ).join(' ');
    };

    // Carrega a lista de convidados do JSON
    fetch('convidados.json')
        .then(response => response.json())
        .then(data => {
            listaDeConvidados = data.map(nome => nome.toLowerCase());
        });

    const mostrarTela = (tela) => {
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
        tela.classList.add('ativa');
    };

    // --- LÓGICA PRINCIPAL ---

    // 1. Verifica o nome do convidado
    btnVerificar.addEventListener('click', async () => {
        const nomeFormatado = capitalizarNomes(inputNome.value.trim());
        
        if (listaDeConvidados.includes(nomeFormatado.toLowerCase())) {
            nomeVerificado = nomeFormatado;
            msgErro.classList.add('hidden');
            
            mostrarTela(telaConvite);
            await carregarConfirmados(); // Espera carregar para saber o status
        } else {
            msgErro.classList.remove('hidden');
        }
    });
    
    // 2. Lógica do botão de Ação (Confirmar ou Cancelar)
    btnAcaoPresenca.addEventListener('click', () => {
        const acao = btnAcaoPresenca.textContent;

        if (acao === 'Confirmar Presença') {
            modalFoto.classList.add('ativa');
        } else if (acao === 'Cancelar Presença') {
            cancelarPresenca();
        }
    });

    // 3. Função para cancelar a presença
    const cancelarPresenca = async () => {
        if (!confirm('Tem certeza que deseja cancelar sua presença?')) {
            return;
        }

        btnAcaoPresenca.textContent = 'Cancelando...';
        btnAcaoPresenca.disabled = true;

        try {
            const response = await fetch('/api/confirmar', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeVerificado })
            });

            if (!response.ok) throw new Error('Falha ao cancelar.');

            alert('Sua presença foi cancelada.');
            await carregarConfirmados(); // Atualiza a lista e o status do botão

        } catch (error) {
            alert('Erro ao cancelar a presença. Tente novamente.');
            console.error(error);
        }
    };

    // 4. Envia a confirmação final para a API (via Modal)
    btnEnviarConfirmacao.addEventListener('click', async () => {
        if (!nomeVerificado || !arquivoFoto) {
            alert('Por favor, selecione uma foto antes de confirmar.');
            return;
        }

        btnEnviarConfirmacao.textContent = 'Enviando...';
        btnEnviarConfirmacao.disabled = true;

        const reader = new FileReader();
        reader.readAsDataURL(arquivoFoto);
        reader.onloadend = async () => {
            const base64Image = reader.result.split(',')[1];
            try {
                const response = await fetch('/api/confirmar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: nomeVerificado, foto: base64Image })
                });

                if (!response.ok) throw new Error((await response.json()).message);
                
                alert('Presença confirmada com sucesso!');
                modalFoto.classList.remove('ativa');
                await carregarConfirmados();

            } catch (error) {
                alert('Erro: ' + error.message);
            } finally {
                btnEnviarConfirmacao.textContent = 'Enviar e Confirmar';
                btnEnviarConfirmacao.disabled = false;
            }
        };
    });

    // 5. Função para buscar e exibir os confirmados (E ATUALIZAR O BOTÃO)
    async function carregarConfirmados() {
        try {
            const response = await fetch(`confirmados.json?v=${new Date().getTime()}`);
            const confirmados = await response.json();
            
            containerConfirmados.innerHTML = ''; 
            
            if (confirmados.length === 0) {
                containerConfirmados.innerHTML = '<p>Seja o primeiro a confirmar!</p>';
            } else {
                confirmados.forEach(pessoa => {
                    const perfilDiv = document.createElement('div');
                    perfilDiv.className = 'perfil-confirmado';
                    perfilDiv.innerHTML = `<img src="${pessoa.fotoUrl}" alt="Foto de ${pessoa.nome}"><p>${pessoa.nome}</p>`;
                    containerConfirmados.appendChild(perfilDiv);
                });
            }

            // ATUALIZA O ESTADO DO BOTÃO
            const jaConfirmado = confirmados.some(p => p.nome === nomeVerificado);
            if (jaConfirmado) {
                btnAcaoPresenca.textContent = 'Cancelar Presença';
                btnAcaoPresenca.style.backgroundColor = '#c0392b'; // Um tom de vermelho
            } else {
                btnAcaoPresenca.textContent = 'Confirmar Presença';
                btnAcaoPresenca.style.backgroundColor = '#8A2BE2'; // Roxo padrão
            }
            btnAcaoPresenca.disabled = false;

        } catch (error) {
            console.error('Não foi possível carregar a lista de confirmados.', error);
        }
    }

    // Fechar modal
    btnFecharModal.addEventListener('click', () => modalFoto.classList.remove('ativa'));
});