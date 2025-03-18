// src/App.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [paragraphNumbers, setParagraphNumbers] = useState('');
  const [extractedParagraphs, setExtractedParagraphs] = useState([]);
  const [rawText, setRawText] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleParagraphNumbersChange = (e) => {
    setParagraphNumbers(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !paragraphNumbers) {
      alert('Por favor, selecciona un archivo PDF e ingresa los números de párrafo.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('paragraphNumbers', JSON.stringify(paragraphNumbers.split(',').map(num => parseInt(num.trim()))));

    try {
      const response = await axios.post('http://localhost:5000/extract-paragraphs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setExtractedParagraphs(response.data.extractedParagraphs);
      setRawText(response.data.rawText); // Mostrar el texto crudo
    } catch (error) {
      console.error('Error extracting paragraphs:', error);
      alert('Error al extraer los párrafos.');
    }
  };

  return (
    <div className="App">
      <h1>Extraer Párrafos de un PDF</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Selecciona un archivo PDF:</label>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
        </div>
        <div>
          <label>Ingresa los números de párrafo (separados por comas):</label>
          <input type="text" value={paragraphNumbers} onChange={handleParagraphNumbersChange} />
        </div>
        <button type="submit">Extraer Párrafos</button>
      </form>
      <div>
        <h2>Párrafos Extraídos:</h2>
        {extractedParagraphs.map((paragraph, index) => (
          <div key={index} style={{ whiteSpace: 'pre-wrap', marginBottom: '20px' }} dangerouslySetInnerHTML={{ __html: paragraph }} />
        ))}
      </div>
      <div>
        <h2>Texto Crudo Extraído por pdf-parse:</h2>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '10px', border: '1px solid #ddd' }}>
          {rawText}
        </pre>
      </div>
    </div>
  );
}

export default App;