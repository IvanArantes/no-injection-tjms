import io
from pypdf import PdfReader
from typing import Tuple, List, Dict

def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[List[Dict[str, str]], dict]:
    """
    Extrai o texto de um PDF recebido em bytes (memória).
    Retorna uma tupla:
    - Lista de dicionários, onde cada dit contém 'page_num' (1-indexed) e 'text'.
    - Dicionário com metadados do PDF (tamanho, num_paginas).
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    num_pages = len(reader.pages)
    
    pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages_text.append({
                "page_num": i + 1,
                "text": text.strip()
            })
            
    metadata = {
        "num_pages": num_pages,
        "bytes_size": len(pdf_bytes)
    }
    
    return pages_text, metadata
