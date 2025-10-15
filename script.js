document.addEventListener('DOMContentLoaded', () => {
    // Elementos das telas
    const telaVerificacao = document.getElementById('tela-verificacao');
    const telaFoto = document.getElementById('tela-foto');
    const telaConvite = document.getElementById('tela-convite');

    // Botões e Inputs
    const btnVerificar = document.getElementById('btn-verificar');
    const inputNome = document.getElementById('input-nome');
    const msgErro = document.getElementById('msg-erro');
    
    const inputFoto = document.getElementById('input-foto');
    const previewFoto = document.getElementById('preview-foto');
    const btnIrConvite = document.getElementById('btn-ir-convite');
    const nomeConvidadoSpan = document.getElementById('nome-convidado');

    const btnConfirmar = document.getElementById('btn-confirmar');
    const containerConfirmados = document.getElementById('container-confirmados');

    let nomeVerificado = '';
    let arquivoFoto = null;

    // Carrega a lista de convidados do nosso arquivo JSON
    let listaDeConvidados = [];
    fetch('convidados.json')
        .then(response => response.json())
        .then(data => {
            listaDeConvidados = data.map(nome => nome.toLowerCase());
        });

    // Função para navegar entre as telas
    function mostrarTela(tela) {
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
        tela.classList.add('ativa');
    }

    // Lógica da verificação de nome
    btnVerificar.addEventListener('click', () => {
        const nomeDigitado = inputNome.value.trim().toLowerCase();
        if (listaDeConvidados.includes(nomeDigitado)) {
            nomeVerificado = inputNome.value.trim(); // Guardamos o nome com maiúsculas/minúsculas originais
            nomeConvidadoSpan.textContent = nomeVerificado;
            msgErro.classList.add('hidden');
            mostrarTela(telaFoto);
        } else {
            msgErro.classList.remove('hidden');
        }
    });
    
    // Lógica do preview da foto
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

    // Lógica para ir para o convite
    btnIrConvite.addEventListener('click', () => {
        if (!arquivoFoto) {
            alert('Por favor, selecione uma foto.');
            return;
        }
        carregarConfirmados();
        mostrarTela(telaConvite);
    });

    // Lógica de confirmação de presença (chama a API)
    btnConfirmar.addEventListener('click', async () => {
        if (!nomeVerificado || !arquivoFoto) {
            alert('Ocorreu um erro. Por favor, recomece.');
            return;
        }

        btnConfirmar.textContent = 'Enviando...';
        btnConfirmar.disabled = true;

        // Precisamos converter a imagem para base64 para enviar via JSON
        const reader = new FileReader();
        reader.readAsDataURL(arquivoFoto);
        reader.onloadend = async () => {
            const base64Image = reader.result.split(',')[1]; // Pega só o código da imagem

            try {
                const response = await fetch('/api/confirmar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nome: nomeVerificado,
                        foto: base64Image
                    })
                });

                if (response.ok) {
                    alert('Presença confirmada com sucesso!');
                    carregarConfirmados(); // Atualiza a lista na tela
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Falha ao confirmar presença.');
                }

            } catch (error) {
                alert('Erro: ' + error.message);
            } finally {
                btnConfirmar.textContent = 'Presença Confirmada!';
            }
        };
    });
    
    // Função para buscar e exibir os confirmados
    async function carregarConfirmados() {
        try {
            const response = await fetch('confirmados.json?cache-buster=' + new Date().getTime()); // Evita cache
            const confirmados = await response.json();
            
            containerConfirmados.innerHTML = ''; // Limpa a lista antes de adicionar
            
            confirmados.forEach(pessoa => {
                const perfilDiv = document.createElement('div');
                perfilDiv.className = 'perfil-confirmado';
                
                const img = document.createElement('img');
                img.src = pessoa.fotoUrl;
                
                const p = document.createElement('p');
                p.textContent = pessoa.nome;

                perfilDiv.appendChild(img);
                perfilDiv.appendChild(p);
                containerConfirmados.appendChild(perfilDiv);
            });

        } catch (error) {
            console.error('Não foi possível carregar a lista de confirmados.', error);
        }
    }
});