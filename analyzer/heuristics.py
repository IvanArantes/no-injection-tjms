import re

# Padrões comuns de injeção de prompt
INJECTION_PATTERNS = [
    r"(?i)\b(ignore)\s+(todas\s+as\s+)?(instruções)\b",
    r"(?i)\b(desconsidere)\s+(o\s+que\s+foi\s+dito)\b",
    r"(?i)\b(você\s+é\s+agora)\b",
    r"(?i)\b(system\s+prompt)\b",
    r"(?i)\b(esqueça\s+(tudo\s+)?(o\s+que))\b",
    r"(?i)\b(traduza\s+isso\s+para)\b",
    r"(?i)\b(imprima\s+as\s+instruções\s+anteriores)\b",
]

def check_heuristics(text: str) -> float:
    """
    Verifica o texto contra expressões regulares conhecidas de injeção de prompt.
    Retorna um score de risco de 0.0 a 100.0 (camada heurística).
    """
    matches = 0
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text):
            matches += 1
            
    # Se encontrar 1 padrão, score vai pra 70. Se encontrar 2 ou mais, 100.
    if matches == 0:
        return 0.0
    elif matches == 1:
        return 70.0
    else:
        return 100.0
