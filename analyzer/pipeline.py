from app.models import AnalysisResponse, Snippet
from .heuristics import check_heuristics
from .ml_classifier import check_ml_model
from .llm_judge import check_llm_judge
import re

def chunk_text(text: str) -> list[str]:
    """
    Divide o texto em sentenças/parágrafos (chunks) para análise granular.
    """
    # Divisão simples por pontos seguidos de espaço ou quebras de linha
    chunks = re.split(r'(?<=[.!?])\s+|\n+', text)
    return [c.strip() for c in chunks if len(c.strip()) > 10]

def analyze_document(pages: list[dict], filename: str) -> AnalysisResponse:
    """
    Orquestra a detecção híbrida nas 3 camadas.
    """
    suspicious_snippets = []
    max_risk_score = 0.0
    ollama_failed = False
    llm_used = False
    
    for page in pages:
        chunks = chunk_text(page["text"])
        
        for chunk in chunks:
            # Camada 1: Heurística (Super Rápido)
            score = check_heuristics(chunk)
            layer = "Heuristics"
            
            # Camada 2: ML Local (Se a heurística não for 100%, tenta o ML para pegar variações)
            if score < 100.0:
                ml_score = check_ml_model(chunk)
                if ml_score > score:
                    score = ml_score
                    layer = "Local ML"
            
            # Camada 3: LLM Judge (Zona Cinzenta: Scores entre 50 e 90)
            if 50.0 <= score < 90.0:
                llm_used = True
                llm_score = check_llm_judge(chunk)
                if llm_score >= 0: # -1.0 significa falha na requisição ao Ollama
                    score = llm_score
                    layer = "LLM Judge"
                else:
                    ollama_failed = True
            
            if score > max_risk_score:
                max_risk_score = score
                
            # Limiar para considerar suspeito e adicionar ao relatório
            if score >= 50.0:
                suspicious_snippets.append(
                    Snippet(
                        text=chunk,
                        layer_detected=layer,
                        risk_score=score,
                        page_num=page["page_num"]
                    )
                )
    
    # Determina o veredito final
    if max_risk_score >= 85.0:
        verdict = "MALICIOUS"
    elif max_risk_score >= 50.0:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"
        
    return AnalysisResponse(
        verdict=verdict,
        overall_score=max_risk_score,
        suspicious_snippets=suspicious_snippets,
        metadata={"filename": filename},
        ollama_failed=ollama_failed,
        llm_used=llm_used
    )
