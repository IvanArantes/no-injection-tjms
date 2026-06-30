# Funcionamento do Sensor de Injeção de Prompt

Este documento explica o fluxo de funcionamento da API de detecção de injeções de prompt do TJMS, com foco especial na camada de Machine Learning (ML) local.

## Arquitetura em 3 Camadas (Pipeline Híbrido)

O sistema foi desenhado para ser eficiente e rodar de forma on-premise (sem enviar dados para a nuvem). Quando um PDF é recebido, ele é lido em memória (sem salvar em disco), dividido em "chunks" (sentenças ou parágrafos) e passa por 3 camadas de segurança:

1. **Camada 1: Heurística (Rápida)**: Usa expressões regulares (Regex) para encontrar padrões clássicos de injeção como *"Ignore as instruções anteriores"* ou *"system prompt"*. É computacionalmente muito barata.
2. **Camada 2: Machine Learning Local**: Se a heurística não cravar com 100% de certeza que é malicioso, o texto passa por um classificador estatístico treinado localmente.
3. **Camada 3: LLM Judge (Ollama)**: Se o modelo de ML ficar na "zona cinzenta" (score entre 50 e 90), o sistema aciona o LLM (como o modelo `phi3` ou `llama3.2`) via Ollama para analisar semanticamente a sentença.

---

## Como o `ml_classifier.py` está funcionando no MVP?

Atualmente, para garantir que o sistema rode de forma ultra-rápida (especialmente sem depender da GPU AMD para esta etapa), usamos a biblioteca clássica **Scikit-Learn**. 

### 1. Extração de Características (TF-IDF)
O modelo não entende palavras, então convertemos o texto em números usando o **TfidfVectorizer**. Ele mapeia a frequência das palavras no texto, dando mais peso para palavras "raras" e importantes, e menos peso para palavras muito comuns.

### 2. Classificação Estatística (Naive Bayes)
Usamos o modelo **MultinomialNB** (Naive Bayes), que trabalha com probabilidades matemáticas. Ele calcula a probabilidade de uma determinada combinação de palavras pertencer à classe `Seguro` ou à classe `Injeção`.

### 3. O Dataset Sintético
Para o MVP funcionar "fora da caixa", incluímos um pequeno dataset em código dentro do método `get_or_train_model()`. Ele tem exemplos hardcoded de sentenças jurídicas seguras e injeções de prompt maliciosas. 
Ao rodar a API pela primeira vez, o modelo é treinado rapidamente com esses poucos dados e o resultado é salvo no arquivo `local_model.pkl` usando `joblib`. Nas próximas chamadas, ele apenas carrega o arquivo do disco.

---

## Como podemos melhorar o ML Classifier no futuro?

O modelo atual (TF-IDF + Naive Bayes com 7 exemplos) é funcional para demonstrar a arquitetura, mas não é robusto o suficiente para produção. Abaixo estão os passos para aprimorá-lo:

### Nível 1: Melhoria Rápida (Ainda usando Scikit-Learn)
- **Dataset Realista**: Criar um arquivo CSV com milhares de exemplos. O TJMS pode extrair trechos de petições reais anonimizadas (Classe 0 - Seguras) e juntar com datasets open-source de injeções de prompt do Hugging Face (Classe 1 - Maliciosas).
- **Mudar o Algoritmo**: Mudar de `MultinomialNB` para **RandomForest** ou **SVM** (Support Vector Machines), que possuem uma acurácia muito maior para textos um pouco mais complexos, mantendo o consumo computacional na CPU muito baixo.

### Nível 2: Redes Neurais (Embeddings Leves)
- Em vez de usar palavras soltas (TF-IDF), podemos usar um modelo local de **Sentence Embeddings** minúsculo (ex: `all-MiniLM-L6-v2` via biblioteca `sentence-transformers`).
- Esse modelo transforma frases em vetores semânticos (ele entende o *significado* da frase). Podemos treinar um classificador leve do scikit-learn em cima desses vetores. Isso pega variações de ataques muito mais sutis.

### Nível 3: Fine-Tuning de Transformers
- Substituir o Scikit-Learn por um modelo pré-treinado do Hugging Face (ex: `distilbert-base-uncased` ou uma versão em português como o `bertimbau`).
- Fazer o fine-tuning desse modelo no nosso dataset de injeções. Isso exige mais processamento, mas é altamente viável:
  - **Para usuários de NVIDIA (resto do grupo):** Pode ser treinado e rodado nativamente com aceleração total via CUDA usando a biblioteca padrão do `PyTorch` ou `transformers`.
  - **Para usuários de AMD (seu caso):** Pode ser configurado via ONNX Runtime ou ROCm (no Linux) para obter aceleração, ou utilizar um modelo pequeno o suficiente para rodar confortavelmente na CPU.

---

## Como Rodar o Projeto

Para executar o projeto, a maneira mais fácil e segura contra problemas de compatibilidade é usando **Docker**:

1. Certifique-se de que o **Docker Desktop** (ou o serviço do Docker) está rodando no seu computador.
2. Abra o terminal (Prompt de Comando ou PowerShell) na pasta raiz do projeto.
3. Suba o container com o comando:
   ```bash
   docker-compose up --build
   ```
4. Aguarde a finalização da compilação e a inicialização do servidor `uvicorn`.
5. Abra o navegador e acesse a interface web em: [http://localhost:8000](http://localhost:8000)
6. Para visualizar o **Contrato da API (Swagger)** e testar os endpoints documentados, acesse: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

*(Nota: Toda vez que você editar códigos `.py` do backend, você precisará parar o terminal com `Ctrl + C` e rodar o comando acima novamente para que as alterações do Python tenham efeito. Já o frontend (HTML/CSS/JS) atualiza apenas com F5).*
