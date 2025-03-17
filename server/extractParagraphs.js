const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractParagraphsFromPDF(filePath, paragraphNumbers) {
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');

    const extractedParagraphs = paragraphNumbers.map(num => {
      // Expresión regular estricta para identificar números de párrafo
      const regex = new RegExp(`^${num}\\.\\s`);
      const startIndex = paragraphs.findIndex(p => regex.test(p));
      if (startIndex === -1) return null;

      let paragraph = paragraphs[startIndex];
      for (let i = startIndex + 1; i < paragraphs.length; i++) {
        // Detener si encontramos un nuevo número de párrafo
        if (/^\d+\.\s/.test(paragraphs[i]) || paragraphs[i].includes('__________________')) break;
        paragraph += ' ' + paragraphs[i].trim(); // Unir líneas con un espacio
      }

      // Formatear números de citas como superíndices (solo los que tienen un punto después)
      paragraph = paragraph.replace(/(\d+)\s\./g, '$1.'); // Eliminar espacios entre número y punto
      paragraph = paragraph.replace(/(\d+)\./g, (match, p1, offset) => {
        // Si es el primer número con punto (número de párrafo), dejarlo normal
        if (offset === 0) return match;
        // Si no, convertirlo en superíndice
        return `<sup>${p1}</sup>.`;
      });

      return paragraph;
    }).filter(p => p);

    return extractedParagraphs; // Devuelve los párrafos extraídos
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw error; // Lanza el error para manejarlo en el backend
  }
}

module.exports = { extractParagraphsFromPDF }; // Exporta la función