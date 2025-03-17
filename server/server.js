const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { extractParagraphsFromPDF } = require('./extractParagraphs');
const pdfParse = require('pdf-parse');

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json());

// Ruta para extraer párrafos específicos
app.post('/extract-paragraphs', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }

  const { pdf } = req.files;
  const { paragraphNumbers } = req.body;

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
    // Guarda el archivo temporalmente
    const tempFilePath = path.join(__dirname, 'temp.pdf');
    await pdf.mv(tempFilePath);

    // Extrae los párrafos usando la función de extractParagraphs.js
    const extractedParagraphs = await extractParagraphsFromPDF(tempFilePath, paragraphNumbersArray);

    // Elimina el archivo temporal
    fs.unlinkSync(tempFilePath);

    // Devuelve los párrafos extraídos
    res.json({ extractedParagraphs });
  } catch (error) {
    console.error('Error reading PDF:', error);
    res.status(500).send('Error processing PDF.');
  }
});

// Nueva ruta para extraer el texto completo
app.post('/extract-full-text', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }

  const { pdf } = req.files;

  try {
    // Guarda el archivo temporalmente
    const tempFilePath = path.join(__dirname, 'temp.pdf');
    await pdf.mv(tempFilePath);

    // Extrae el texto completo del PDF
    const dataBuffer = fs.readFileSync(tempFilePath);
    const data = await pdfParse(dataBuffer);
    const fullText = data.text;

    // Elimina el archivo temporal
    fs.unlinkSync(tempFilePath);

    // Devuelve el texto completo
    res.json({ fullText });
  } catch (error) {
    console.error('Error reading PDF:', error);
    res.status(500).send('Error processing PDF.');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});