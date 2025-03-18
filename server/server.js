// server.js
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { extractParagraphsFromText } = require('./extractParagraphs');
const pdfParse = require('pdf-parse');

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json({ limit: '50mb' }));

// Almacenamiento en memoria para los datos (en producción usarías una base de datos)
const pdfData = {};

// Ruta para procesar el PDF y obtener su texto
app.post('/process-pdf', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }

  const { pdf } = req.files;

  try {
    // Guarda el archivo temporalmente
    const tempFilePath = path.join(__dirname, 'temp.pdf');
    await pdf.mv(tempFilePath);

    // Genera un ID único para el PDF
    const pdfId = pdf.name + '_' + Date.now();

    // Extrae el texto crudo usando pdf-parse
    const dataBuffer = fs.readFileSync(tempFilePath);
    const data = await pdfParse(dataBuffer);
    const rawText = data.text; // Texto crudo extraído

    // Almacena los datos del PDF
    pdfData[pdfId] = {
      originalText: rawText,
      editedText: rawText, // Inicialmente igual al texto original
      fileName: pdf.name
    };

    // Elimina el archivo temporal
    fs.unlinkSync(tempFilePath);

    // Devuelve el texto crudo y el ID del PDF
    res.json({ 
      rawText,
      pdfId
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).send('Error processing PDF.');
  }
});

// Ruta para guardar el texto editado
app.post('/save-edited-text', (req, res) => {
  const { pdfId, editedText } = req.body;
  
  if (!pdfId || editedText === undefined) {
    return res.status(400).send('Missing required fields');
  }

  // Verifica si existe este PDF
  if (!pdfData[pdfId]) {
    return res.status(404).send('PDF not found');
  }

  // Guarda el texto editado
  pdfData[pdfId].editedText = editedText;
  
  res.json({ success: true, message: 'Text edited successfully' });
});

// Ruta para extraer párrafos del texto editado con análisis completo
app.post('/extract-from-edited', async (req, res) => {
  const { pdfId, paragraphNumbers } = req.body;
  
  if (!pdfId || !paragraphNumbers) {
    return res.status(400).send('Missing required fields');
  }

  // Verifica si existe este PDF
  if (!pdfData[pdfId]) {
    return res.status(404).send('PDF not found');
  }

  // Parsea paragraphNumbers desde JSON
  let paragraphNumbersArray;
  try {
    paragraphNumbersArray = JSON.parse(paragraphNumbers);
    if (!Array.isArray(paragraphNumbersArray)) {
      return res.status(400).send('paragraphNumbers must be an array.');
    }
  } catch (error) {
    return res.status(400).send('Invalid paragraphNumbers format.');
  }

  try {
    // Usa el texto editado para extraer los párrafos
    const editedText = pdfData[pdfId].editedText;
    const extractedParagraphs = extractParagraphsFromText(editedText, paragraphNumbersArray);
    
  } catch (error) {
    console.error('Error extracting paragraphs:', error);
    res.status(500).send('Error extracting paragraphs');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});