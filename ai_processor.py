import json
import sys
import os
import re
from langchain_nvidia_ai_endpoints import ChatNVIDIA

def clean_text_from_citations(text):
    """
    Limpia el texto eliminando las citas bibliográficas que aparecen después de líneas divisorias.
    """
    # Buscar patrones de líneas divisorias seguidas de citas
    citation_pattern = r'_{2,}[\s\n]+((?:\d+[\s\n]+[^_]+)+)'
    
    # Reemplazar las secciones de citas con cadena vacía
    cleaned_text = re.sub(citation_pattern, '', text, flags=re.DOTALL)
    
    # También eliminar líneas divisorias sueltas
    cleaned_text = re.sub(r'_{2,}[\s\n]*', '', cleaned_text)
    
    return cleaned_text

def extract_paragraph(text, paragraph_number):
    """
    Extrae el párrafo especificado por su número del texto completo.
    Implementa múltiples estrategias para encontrar el párrafo.
    """
    # Primero limpiar el texto de citas bibliográficas
    text = clean_text_from_citations(text)
    
    paragraph_number = str(paragraph_number)
    
    # Estrategia 1: Buscar formato exacto "X. Texto del párrafo"
    pattern1 = r'(?:^|\n)' + re.escape(paragraph_number) + r'\.\s+(.*?)(?=(?:\n\d+\.)|$)'
    match1 = re.search(pattern1, text, re.DOTALL)
    if match1:
        return match1.group(1).strip()
    
    # Estrategia 2: Buscar líneas que comiencen con el número de párrafo
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line_clean = line.strip()
        
        # Verificar diferentes formatos de numeración
        if (line_clean.startswith(f"{paragraph_number}.") or 
            line_clean.startswith(f"{paragraph_number} ") or
            re.match(r'^' + re.escape(paragraph_number) + r'[\.\s]', line_clean)):
            
            # Extraer el párrafo actual
            paragraph = line_clean
            
            # Si el párrafo comienza con un número, eliminar ese prefijo
            if re.match(r'^\d+[\.\s]', paragraph):
                paragraph = re.sub(r'^\d+[\.\s]+', '', paragraph)
            
            # Buscar líneas adicionales que pertenezcan al mismo párrafo
            j = i + 1
            while j < len(lines) and not re.match(r'^\d+[\.\s]', lines[j].strip()):
                if lines[j].strip():  # Solo añadir líneas no vacías
                    paragraph += ' ' + lines[j].strip()
                j += 1
                
            return paragraph.strip()
    
    # Estrategia 3: Buscar en el contenido del texto por página
    page_pattern = r'Página\s+\d+:\s*(.*?)(?=(?:Página\s+\d+:)|$)'
    pages = re.findall(page_pattern, text, re.DOTALL)
    
    # Buscar en cada página
    for page_content in pages:
        # Buscar párrafos numerados en esta página
        paragraph_pattern = r'(?:^|\s)' + re.escape(paragraph_number) + r'[\.\s]+(.*?)(?=(?:\s\d+[\.\s])|$)'
        paragraph_match = re.search(paragraph_pattern, page_content, re.DOTALL)
        if paragraph_match:
            return paragraph_match.group(1).strip()
    
    # Estrategia 4: Dividir el texto en párrafos por líneas en blanco
    paragraphs = re.split(r'\n\s*\n', text)
    try:
        # Intentar obtener el párrafo por índice (restando 1 porque los arrays empiezan en 0)
        idx = int(paragraph_number) - 1
        if 0 <= idx < len(paragraphs):
            return paragraphs[idx].strip()
    except ValueError:
        pass
    
    # No se encontró el párrafo
    return None

def extract_keywords_locally(text):
    """
    Extrae palabras clave de un texto utilizando técnicas locales.
    """
    # Extraer palabras con más de 3 letras, excluyendo palabras comunes
    words = re.findall(r'\b[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{4,}\b', text.lower())
    
    # Palabras comunes en español para excluir
    common_words = {'para', 'como', 'este', 'esta', 'estos', 'estas', 'pero', 'porque', 'cuando', 'donde', 'aunque', 'desde', 'hasta', 'entre', 'sobre', 'según', 'mediante', 'durante', 'contra', 'hacia', 'dentro', 'fuera', 'tras', 'ante', 'bajo', 'cabe', 'sin', 'con', 'por', 'que', 'cual', 'quien', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'donde', 'adonde', 'como', 'cuando', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'sido', 'sido', 'cada', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'mismos', 'mismas', 'tanto', 'tanta', 'tantos', 'tantas', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas', 'algún', 'alguna', 'algunos', 'algunas', 'ningún', 'ninguna', 'ningunos', 'ningunas', 'cierto', 'cierta', 'ciertos', 'ciertas', 'más', 'menos', 'tanto', 'tanta', 'tantos', 'tantas'}
    
    # Filtrar palabras comunes y contar frecuencia
    word_count = {}
    for word in words:
        if word not in common_words:
            word_count[word] = word_count.get(word, 0) + 1
    
    # Ordenar por frecuencia y tomar las 10 más comunes
    sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
    top_words = [word for word, count in sorted_words[:10]]
    
    return top_words

def process_with_ai(text, paragraph_number, custom_prompt=""):
    try:
        # Extraer el párrafo específico
        paragraph = extract_paragraph(text, paragraph_number)
        
        if not paragraph:
            sys.stdout.write(f"No se encontró el párrafo {paragraph_number}. Intenta con otro número.\n")
            sys.stdout.flush()
            return
        
        # Limitar la longitud del párrafo para evitar errores
        if len(paragraph) > 2000:
            paragraph = paragraph[:2000] + "..."
        
        # Usar extracción local de palabras clave directamente
        keywords = extract_keywords_locally(paragraph)
        
        # Imprimir solo las palabras clave extraídas, sin ningún otro texto
        sys.stdout.write(', '.join(keywords) + '\n')
        sys.stdout.flush()
        
    except Exception as e:
        # Capturar y manejar errores sin mostrar detalles técnicos
        sys.stdout.write(f"Error al procesar el párrafo: {str(e)}\n")
        sys.stdout.flush()

if __name__ == "__main__":
    try:
        # Leer datos de entrada
        input_data = json.loads(sys.stdin.read())
        text = input_data.get('text', '')
        paragraph_number = input_data.get('paragraphNumber', '')
        custom_prompt = input_data.get('customPrompt', '')
        
        # Verificar datos
        if not text:
            sys.stdout.write("Error: No se proporcionó texto del PDF.\n")
            sys.stdout.flush()
        elif not paragraph_number:
            sys.stdout.write("Error: No se proporcionó número de párrafo.\n")
            sys.stdout.flush()
        else:
            # Procesar con IA
            process_with_ai(text, paragraph_number, custom_prompt)
    except Exception as e:
        # Simplificar mensaje de error
        sys.stdout.write(f"Error: {str(e)}\n")
        sys.stdout.flush() 