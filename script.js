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
    const btnAcaoPresenca = document.getElementById('btn-acao-presenca');
    const btnEnviarConfirmacao = document.getElementById('btn-enviar-confirmacao');
    
    // Elementos de display
    const msgErro = document.getElementById('msg-erro');
    const containerConfirmados = document.getElementById('container-confirmados');

    // Variáveis de estado
    let nomeVerificado = '';
    let listaDeConvidados = [];
    // MUDANÇA AQUI: Esta variável vai guardar a foto já pronta para envio.
    let fotoBase64 = null; 

    // --- FUNÇÕES AUXILIARES ---

    const capitalizarNomes = (str) => {
        return str.toLowerCase().split(' ').map(palavra => 
            palavra.charAt(0).toUpperCase() + palavra.slice(1)
        ).join(' ');
    };

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

    btnVerificar.addEventListener('click', async () => {
        const nomeFormatado = capitalizarNomes(inputNome.value.trim());
        
        if (listaDeConvidados.includes(nomeFormatado.toLowerCase())) {
            nomeVerificado = nomeFormatado;
            msgErro.classList.add('hidden');
            
            mostrarTela(telaConvite);
            await carregarConfirmados();
        } else {
            msgErro.classList.remove('hidden');
        }
    });
    
    btnAcaoPresenca.addEventListener('click', () => {
        const acao = btnAcaoPresenca.textContent;

        if (acao === 'Confirmar Presença') {
            // MUDANÇA AQUI: Limpamos seleções anteriores ao abrir o modal
            fotoBase64 = null;
            inputFoto.value = null; // Limpa o seletor de arquivo
            previewFoto.classList.add('hidden');
            modalFoto.classList.add('ativa');
        } else if (acao === 'Cancelar Presença') {
            cancelarPresenca();
        }
    });

    const cancelarPresenca = async () => {
        if (!confirm('Tem certeza que deseja cancelar sua presença?')) return;
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
            await carregarConfirmados();
        } catch (error) {
            alert('Erro ao cancelar a presença. Tente novamente.');
            console.error(error);
        }
    };

    // MUDANÇA AQUI: A lógica de ler o arquivo foi movida para cá
    inputFoto.addEventListener('change', (event) => {
        if (event.target.files && event.target.files[0]) {
            const arquivo = event.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Mostra a pré-visualização
                previewFoto.src = e.target.result;
                previewFoto.classList.remove('hidden');
                // Guarda a foto já convertida na nossa variável
                fotoBase64 = e.target.result.split(',')[1];
            };

            reader.readAsDataURL(arquivo);
        }
    });

    // MUDANÇA AQUI: Este evento agora está muito mais simples
    btnEnviarConfirmacao.addEventListener('click', async () => {
        // A verificação agora é na variável que já tem a foto pronta
        if (!fotoBase64) {
            alert('Por favor, selecione uma foto.');
            return;
        }

        btnEnviarConfirmacao.textContent = 'Enviando...';
        btnEnviarConfirmacao.disabled = true;

        try {
            const response = await fetch('/api/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeVerificado, foto: fotoBase64 })
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
    });

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

            const jaConfirmado = confirmados.some(p => p.nome === nomeVerificado);
            if (jaConfirmado) {
                btnAcaoPresenca.textContent = 'Cancelar Presença';
                btnAcaoPresenca.style.backgroundColor = '#c0392b';
            } else {
                btnAcaoPresenca.textContent = 'Confirmar Presença';
                btnAcaoPresenca.style.backgroundColor = '#8A2BE2';
            }
            btnAcaoPresenca.disabled = false;

        } catch (error) {
            console.error('Não foi possível carregar a lista de confirmados.', error);
        }
    }

    btnFecharModal.addEventListener('click', () => modalFoto.classList.remove('ativa'));
});