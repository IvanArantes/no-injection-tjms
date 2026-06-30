from pydantic import BaseModel
from typing import List, Optional

class Snippet(BaseModel):
    text: str
    layer_detected: str
    risk_score: float
    page_num: Optional[int] = None

class AnalysisResponse(BaseModel):
    verdict: str # "SAFE", "SUSPICIOUS", "MALICIOUS"
    overall_score: float # 0.0 to 100.0
    suspicious_snippets: List[Snippet]
    metadata: dict
    ollama_failed: bool = False
    llm_used: bool = False
