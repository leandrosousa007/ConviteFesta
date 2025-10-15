document.addEventListener('DOMContentLoaded', () => {
    // Telas principais
    const telaVerificacao = document.getElementById('tela-verificacao');
    const telaConvite = document.getElementById('tela-convite');

    // Elementos do Modal
    const modalFoto = document.getElementById('modal-foto');
    const btnFecharModal = document.querySelector('.fechar-modal');
    
    // Botões e Inputs
    const btnVerificar = document.getElementById('btn-verificar');
    const inputNome = document.getElementById('input-nome');
    const msgErro = document.getElementById('msg-erro');
    
    const inputFoto = document.getElementById('input-foto');
    const previewFoto = document.getElementById('preview-foto');
    
    const btnAbrirModal = document.getElementById('btn-abrir-modal-confirmacao');
    const btnEnviarConfirmacao = document.getElementById('btn-enviar-confirmacao');
    
    const containerConfirmados = document.getElementById('container-confirmados');

    // Variáveis de estado
    let nomeVerificado = '';
    let arquivoFoto = null;
    let listaDeConvidados = [];

    // Carrega a lista de convidados do nosso arquivo JSON
    fetch('convidados.json')
        .then(response => response.json())
        .then(data => {
            listaDeConvidados = data.map(nome => nome.toLowerCase());
        });

    // Função para navegar entre as telas principais
    function mostrarTela(tela) {
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
        tela.classList.add('ativa');
    }

    // --- FLUXO PRINCIPAL ---

    // 1. Verifica o nome do convidado
    btnVerificar.addEventListener('click', () => {
        const nomeDigitado = inputNome.value.trim().toLowerCase();
        if (listaDeConvidados.includes(nomeDigitado)) {
            nomeVerificado = inputNome.value.trim(); // Guarda o nome original
            msgErro.classList.add('hidden');
            
            // Vai para a tela do convite e já carrega a lista de confirmados
            mostrarTela(telaConvite);
            carregarConfirmados();
        } else {
            msgErro.classList.remove('hidden');
        }
    });

    // 2. Botão "Confirmar Presença" abre o modal de foto
    btnAbrirModal.addEventListener('click', () => {
        modalFoto.classList.add('ativa');
    });

    // 3. Fecha o modal
    btnFecharModal.addEventListener('click', () => {
        modalFoto.classList.remove('ativa');
    });

    // 4. Prepara a foto para o upload
    inputFoto.addEventListener('change', (event) => {
        if (event.target.files && event.target.files[0]) {
            arquivoFoto = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                previewFoto.src = e.target.result;
                previewFoto.classList.remove('hidden');
            }
            reader.readAsDataURL(arquivoFoto);
        }
    });

    // 5. Envia a confirmação final para a API
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
                    body: JSON.stringify({
                        nome: nomeVerificado,
                        foto: base64Image
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Falha ao confirmar presença.');
                }
                
                alert('Presença confirmada com sucesso!');
                modalFoto.classList.remove('ativa'); // Fecha o modal
                btnAbrirModal.textContent = 'Presença Confirmada!'; // Muda o texto do botão principal
                btnAbrirModal.disabled = true;
                carregarConfirmados(); // Atualiza a lista na tela

            } catch (error) {
                alert('Erro: ' + error.message);
                btnEnviarConfirmacao.textContent = 'Enviar e Confirmar';
                btnEnviarConfirmacao.disabled = false;
            }
        };
    });
    
    // Função para buscar e exibir os confirmados
    async function carregarConfirmados() {
        try {
            // Adiciona um parâmetro aleatório para evitar que o navegador use uma versão antiga (cache) do arquivo
            const response = await fetch(`confirmados.json?v=${new Date().getTime()}`);
            const confirmados = await response.json();
            
            containerConfirmados.innerHTML = ''; 
            
            if (confirmados.length === 0) {
                containerConfirmados.innerHTML = '<p>Seja o primeiro a confirmar!</p>';
            } else {
                confirmados.forEach(pessoa => {
                    const perfilDiv = document.createElement('div');
                    perfilDiv.className = 'perfil-confirmado';
                    
                    const img = document.createElement('img');
                    img.src = pessoa.fotoUrl;
                    img.alt = `Foto de ${pessoa.nome}`;
                    
                    const p = document.createElement('p');
                    p.textContent = pessoa.nome;

                    perfilDiv.appendChild(img);
                    perfilDiv.appendChild(p);
                    containerConfirmados.appendChild(perfilDiv);
                });
            }

        } catch (error) {
            console.error('Não foi possível carregar a lista de confirmados.', error);
            containerConfirmados.innerHTML = '<p>Não foi possível carregar a lista no momento.</p>';
        }
    }
});