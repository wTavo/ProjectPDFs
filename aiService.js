class AIService {
    constructor() {
        this.apiUrl = '/api/analyze';
        this.isProcessing = false;
    }

    async analyzeText(pdfText, paragraphNumber, customPrompt = '') {
        if (this.isProcessing) {
            throw new Error('Ya hay un análisis en proceso');
        }

        this.isProcessing = true;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pdfText,
                    paragraphNumber,
                    customPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }

            // Para manejar respuestas
            const text = await response.text();
            
            // Actualizar la UI con el resultado
            const responseElement = document.getElementById('ai-response');
            
            // Formatear las palabras clave para mejor visualización
            const formattedResult = this.formatKeywords(text);
            responseElement.innerHTML = formattedResult;
            
            this.isProcessing = false;
            return text;
            
        } catch (error) {
            this.isProcessing = false;
            console.error('Error al analizar con IA:', error);
            throw error;
        }
    }
    
    // Método para formatear las palabras clave
    formatKeywords(text) {
        // Si el texto está vacío o es un mensaje de error
        if (!text || text.startsWith('Error:') || text.startsWith('No se pudo encontrar')) {
            return `<p class="placeholder-text">${text || 'No se obtuvieron resultados'}</p>`;
        }
        
        // Limpiar la respuesta para asegurar que solo contiene palabras clave
        let cleanText = text.trim();
        
        // Eliminar cualquier texto que no sean palabras y comas
        const validKeywords = [];
        const parts = cleanText.split(',');
        
        for (const part of parts) {
            const keyword = part.trim();
            // Solo incluir palabras reales (no números o símbolos solos)
            if (keyword && /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/.test(keyword)) {
                validKeywords.push(keyword);
            }
        }
        
        if (validKeywords.length === 0) {
            return '<p class="placeholder-text">No se pudieron extraer palabras clave del párrafo seleccionado.</p>';
        }
        
        // Crear elementos HTML para cada palabra clave
        const keywordElements = validKeywords.map(keyword => 
            `<div class="keyword-item">${keyword}</div>`
        ).join('');
        
        return `<div class="keywords-container">${keywordElements}</div>`;
    }
}

// Exportar la clase para su uso en otros archivos
window.AIService = AIService; 