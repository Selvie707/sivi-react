import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [sentence, setSentence] = useState(''); // Menyimpan kalimat deteksi
  const [lastConfidence, setLastConfidence] = useState(null); // Menyimpan confidence terakhir
  const [imageSrc, setImageSrc] = useState('');
  const [fetchInterval, setFetchInterval] = useState(1000); // Interval fetching dalam ms
  const [intervalId, setIntervalId] = useState(null); // Menyimpan ID interval aktif
  const [dictionary, setDictionary] = useState({});

  useEffect(() => {
    // Mengambil dictionary dari file public
    const fetchDictionary = async () => {
      try {
        const response = await fetch('/dictionary.json');
        const data = await response.json();
        setDictionary(data); // Simpan dictionary yang diambil
      } catch (error) {
        console.error('Error fetching dictionary:', error);
      }
    };

    fetchDictionary(); // Panggil fungsi untuk mengambil dictionary
    setImageSrc('https://eae5-34-73-255-143.ngrok-free.app/video_feed'); // Set video feed URL
    return () => clearInterval(intervalId); // Cleanup saat unmount
  }, []);

  // Fungsi untuk autocorrect, memperbaiki spasi dan typo
  const autocorrect = (text) => {
    let correctedText = text.toLowerCase(); // Pastikan semua huruf menjadi kecil

    // Cek setiap kata dalam dictionary
    Object.entries(dictionary).forEach(([word, typoList]) => {
      typoList.forEach(({ typo }) => {
        const regex = new RegExp(`\\b${typo}\\b`, 'gi'); // Regex untuk memastikan kata yang cocok
        correctedText = correctedText.replace(regex, word); // Ganti typo dengan kata yang benar
      });
    });

    return correctedText;
  };

  useEffect(() => {
    if (intervalId) clearInterval(intervalId); // Hentikan interval sebelumnya jika ada

    // Create a new interval untuk fetch berdasarkan fetchInterval
    const newIntervalId = setInterval(async () => {
      try {
        const response = await axios.get('https://eae5-34-73-255-143.ngrok-free.app/detections');

        if (response.data && response.data.length > 0) {
          const detectedClass = response.data[0].class;
          const detectedConfidence = response.data[0].confidence; // Confidence dari API

          // Hanya tambahkan huruf jika confidence > 50%
          if (detectedConfidence > 0.5) {
            setSentence((prevSentence) => {
              const updatedSentence = prevSentence + detectedClass; // Tambahkan huruf ke hasil deteksi
              return autocorrect(updatedSentence); // Perbaiki hasil deteksi dengan autocorrect
            });
            setLastConfidence(detectedConfidence); // Update confidence terakhir
          }
        }
      } catch (error) {
        console.error('Error fetching detections:', error);
      }
    }, fetchInterval);

    setIntervalId(newIntervalId); // Simpan ID interval baru
    return () => clearInterval(newIntervalId); // Cleanup saat fetchInterval berubah
  }, [fetchInterval, dictionary]); // Update saat fetchInterval atau dictionary berubah

  const handleIntervalChange = (e) => {
    setFetchInterval(Number(e.target.value)); // Update interval fetching
  };

  // Menghapus seluruh hasil deteksi
  const handleClearAll = () => {
    setSentence('');
    setLastConfidence(null); // Reset confidence
  };

  // Menghapus huruf terakhir dari hasil deteksi
  const handleClearLast = () => {
    setSentence((prevSentence) => prevSentence.slice(0, -1));
    setLastConfidence(null); // Reset confidence karena huruf terakhir dihapus
  };

  // Menambahkan spasi di akhir kalimat
  const handleAddSpace = () => {
    setSentence((prevSentence) => prevSentence + ' '); // Tambahkan spasi di akhir kalimat
  };

  return (
    <div>
      <h1>Real-Time Object Detection</h1>
      <div>
        <h2>Live Feed:</h2>
        <img src={imageSrc} alt="Video Feed" style={{ width: '100%', height: 'auto' }} />
      </div>
      <div>
        <h2>Detected Sentence:</h2>
        {lastConfidence !== null && ( // Tampilkan confidence jika ada
          <p>Last Confidence: {lastConfidence}%</p>
        )}
        <p>{sentence}</p>
        <button onClick={handleClearAll}>Clear All</button> {/* Tombol untuk menghapus seluruh hasil */}
        <button onClick={handleClearLast}>Clear Last Character</button> {/* Tombol untuk menghapus huruf terakhir */}
        <button onClick={handleAddSpace}>Add Space</button> {/* Tombol untuk menambahkan spasi */}
      </div>
      <div>
        <h2>Set Fetch Interval:</h2>
        <select onChange={handleIntervalChange} value={fetchInterval}>
          <option value={1000}>1 second</option>
          <option value={1500}>1.5 seconds</option>
          <option value={2000}>2 seconds</option>
          <option value={2500}>2.5 seconds</option>
          <option value={3000}>3 seconds</option>
          <option value={3500}>3.5 seconds</option>
          <option value={4000}>4 seconds</option>
          <option value={4500}>4.5 seconds</option>
          <option value={5000}>5 seconds</option>
        </select>
      </div>
    </div>
  );
}

export default App;