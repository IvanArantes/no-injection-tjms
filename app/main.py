from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .models import AnalysisResponse
from analyzer.pipeline import analyze_document
from utils.pdf_parser import extract_text_from_pdf
import os

app = FastAPI(
    title="API de Detecção de Injeção de Prompt - TJMS",
    version="1.0.0",
    description="""
Microsserviço on-premise para triagem de segurança em documentos jurídicos.
Esta API processa arquivos PDF em memória e utiliza um pipeline híbrido (Heurísticas, ML Local e LLM) para detectar tentativas de injeção de prompt, retornando um score de risco e o veredito sem alterar o arquivo original.
    """,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post(
    "/api/v1/analyze", 
    response_model=AnalysisResponse,
    tags=["Análise de Segurança"],
    summary="Analisar Documento PDF",
    description="Recebe um arquivo PDF via form-data (UploadFile), extrai o texto integralmente em memória e o submete às 3 camadas de detecção de injeção de prompt. Retorna o veredito final, score de risco geral e a lista de trechos marcados como suspeitos."
)
async def analyze_pdf(file: UploadFile = File(..., description="Arquivo PDF do processo jurídico a ser analisado.")):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Somente arquivos PDF são suportados.")
    
    # Lê o PDF inteiro para a memória (não salva em disco)
    content = await file.read()
    
    # Extrai o texto do PDF
    try:
        pages_text, metadata = extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao extrair texto do PDF: {str(e)}")
    
    # Analisa o documento
    result = analyze_document(pages_text, file.filename)
    
    # Junta os metadados da extração com os metadados da análise
    result.metadata.update(metadata)
    
    return result

# Serve the static frontend files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
os.makedirs(frontend_path, exist_ok=True) # Ensure it exists so startup doesn't fail before we write frontend files
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
