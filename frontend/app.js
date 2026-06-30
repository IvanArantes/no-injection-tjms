const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const btnAnalyze = document.getElementById('btn-analyze');
let selectedFile = null;

// Handlers Drag and Drop
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
        alert('Por favor, selecione um arquivo PDF.');
        return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    filePreview.classList.remove('hidden');
    btnAnalyze.disabled = false;
}

// Fluxo de Análise
btnAnalyze.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Transição visual do botão
    const btnText = btnAnalyze.querySelector('.btn-text');
    const btnSpinner = btnAnalyze.querySelector('.spinner-btn');
    btnText.textContent = 'Carregando...';
    btnSpinner.classList.remove('hidden');
    btnAnalyze.disabled = true;
    
    // Pequeno delay para a UI renderizar o botão antes de ir pra etapa 2
    setTimeout(async () => {
        goToStep(2);
        
        // Prepara os dados
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Simulação visual das camadas
            simulateLayersProgress();
            
            // Chamada real à API
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Finaliza animações das camadas e vai para o resultado
            finalizeLayersProgress();
            setTimeout(() => showResults(data), 1000);
            
        } catch (error) {
            alert('Falha ao analisar o documento: ' + error.message);
            resetApp();
        } finally {
            // Restaura o botão
            btnText.textContent = 'Analisar documento';
            btnSpinner.classList.add('hidden');
        }
    }, 100);
});

// UI Helpers
function goToStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`step-${step}`).classList.remove('hidden');
    
    const steps = [
        "Etapa 1 · Envio do documento",
        "Etapa 2 · Detecção híbrida em execução",
        "Etapa 3 · Resultado da triagem"
    ];
    document.getElementById('current-step-label').textContent = steps[step-1];
    
    for (let i = 1; i <= step; i++) {
        document.querySelector(`.step[data-step="${i}"]`).classList.add('active');
    }
}

function resetApp() {
    selectedFile = null;
    filePreview.classList.add('hidden');
    btnAnalyze.disabled = true;
    fileInput.value = '';
    
    // Reseta classes das layers
    const layers = ['layer-extraction', 'layer-chunking', 'layer-heuristics', 'layer-ml', 'layer-llm'];
    layers.forEach(id => {
        const el = document.getElementById(id);
        el.className = 'layer-item pending';
        el.querySelector('.layer-icon').className = 'layer-icon';
    });
    document.getElementById('layer-extraction').classList.remove('pending');
    document.getElementById('layer-extraction').querySelector('.layer-icon').classList.add('spinner');
    
    goToStep(1);
}

// Simulação Visual
let simTimeouts = [];
function simulateLayersProgress() {
    const layers = ['layer-extraction', 'layer-chunking', 'layer-heuristics', 'layer-ml', 'layer-llm'];
    
    // Layer 0 e 1 vão rápido
    simTimeouts.push(setTimeout(() => markLayerDone('layer-extraction', 'layer-chunking'), 500));
    simTimeouts.push(setTimeout(() => markLayerDone('layer-chunking', 'layer-heuristics'), 1200));
    simTimeouts.push(setTimeout(() => markLayerDone('layer-heuristics', 'layer-ml'), 2000));
    simTimeouts.push(setTimeout(() => {
        markLayerDone('layer-ml', 'layer-llm');
        document.querySelector('#layer-llm .processing-text').classList.remove('hidden');
    }, 3500));
}

function finalizeLayersProgress() {
    simTimeouts.forEach(clearTimeout);
    ['layer-extraction', 'layer-chunking', 'layer-heuristics', 'layer-ml', 'layer-llm'].forEach(id => {
        const el = document.getElementById(id);
        el.className = 'layer-item done';
        el.querySelector('.layer-icon').className = 'layer-icon';
    });
    document.querySelector('#layer-llm .processing-text').classList.add('hidden');
}

function markLayerDone(currentId, nextId) {
    const current = document.getElementById(currentId);
    current.className = 'layer-item done';
    current.querySelector('.layer-icon').classList.remove('spinner');

    if (nextId) {
        const next = document.getElementById(nextId);
        next.className = 'layer-item processing';
        next.querySelector('.layer-icon').className = 'layer-icon spinner';
    }
}

function showResults(data) {
    goToStep(3);
    
    // Reseta o alerta do Ollama
    document.getElementById('ollama-warning').classList.add('hidden');
    
    const card = document.getElementById('verdict-card');
    const verdictText = document.getElementById('verdict-text');
    const verdictScore = document.getElementById('verdict-score');
    
    card.className = 'verdict-card';
    if (data.verdict === 'SAFE') {
        card.classList.add('safe');
        verdictText.textContent = 'Seguro';
    } else if (data.verdict === 'SUSPICIOUS') {
        card.classList.add('suspicious');
        verdictText.textContent = 'Suspeito (Zona Cinzenta)';
    } else {
        card.classList.add('malicious');
        verdictText.textContent = 'Malicioso (Injeção Detectada)';
    }
    
    verdictScore.textContent = `${data.overall_score.toFixed(1)}%`;
    
    const llmStatus = document.getElementById('llm-used-status');
    if (data.llm_used) {
        llmStatus.textContent = 'Acionada';
        llmStatus.style.color = 'var(--warning)';
    } else {
        llmStatus.textContent = 'Não Necessária';
        llmStatus.style.color = 'var(--text-muted)';
    }
    
    if (data.ollama_failed) {
        document.getElementById('ollama-warning').classList.remove('hidden');
    }
    
    const container = document.getElementById('snippets-container');
    container.innerHTML = '';
    document.getElementById('snippet-count').textContent = data.suspicious_snippets.length;
    
    if (data.suspicious_snippets.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted)">Nenhum trecho suspeito foi encontrado.</p>';
    } else {
        data.suspicious_snippets.forEach(s => {
            const div = document.createElement('div');
            div.className = `snippet-card ${s.risk_score >= 85 ? 'high-risk' : ''}`;
            div.innerHTML = `
                <div class="snippet-meta">
                    <span><strong>Página:</strong> ${s.page_num || 'N/A'}</span>
                    <span><strong>Camada:</strong> ${s.layer_detected}</span>
                    <span><strong>Risco:</strong> ${s.risk_score.toFixed(1)}%</span>
                </div>
                <div class="snippet-text">${escapeHtml(s.text)}</div>
            `;
            container.appendChild(div);
        });
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
