React:

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const App = () => {
  const videoRef = useRef(null);
  const [sentence, setSentence] = useState(""); // Menyimpan kalimat hasil deteksi
  const [lastConfidence, setLastConfidence] = useState(null); // Confidence terakhir
  const [fetchInterval, setFetchInterval] = useState(1000); // Interval fetching (ms)
  const [intervalId, setIntervalId] = useState(null); // ID interval aktif
  const [dictionary, setDictionary] = useState({}); // Dictionary untuk autocorrect
  const [detections, setDetections] = useState([]); // Menyimpan hasil deteksi individu

  useEffect(() => {
    // Akses kamera dan atur video feed
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing camera: ", err));

    // Ambil dictionary dari file public
    const fetchDictionary = async () => {
      try {
        const response = await fetch("/dictionary.json");
        const data = await response.json();
        setDictionary(data);
      } catch (error) {
        console.error("Error fetching dictionary:", error);
      }
    };

    fetchDictionary();
    return () => clearInterval(intervalId); // Cleanup saat unmount
  }, []);

  const autocorrect = (text) => {
    let correctedText = text.toLowerCase();
    Object.entries(dictionary).forEach(([word, typoList]) => {
      typoList.forEach(({ typo }) => {
        const regex = new RegExp(\\b${typo}\\b, "gi");
        correctedText = correctedText.replace(regex, word);
      });
    });
    return correctedText;
  };

  const captureFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const frame = canvas.toDataURL("image/jpeg");
      return frame.split(",")[1]; // Hanya ambil data base64
    }
    return null;
  };

  const sendFrameToServer = async () => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      const response = await axios.post("https://f9a4-34-75-4-219.ngrok-free.app//process_frame", {
        frame,
      });

      if (response.data && response.data.length > 0) {
        const detectedClass = response.data[0].class;
        const detectedConfidence = response.data[0].confidence;

        if (detectedConfidence > 0.5) {
          setSentence((prevSentence) => {
            const updatedSentence = prevSentence + detectedClass;
            return autocorrect(updatedSentence);
          });

          setDetections((prevDetections) => [
            ...prevDetections,
            { class: detectedClass, confidence: detectedConfidence },
          ]);
          setLastConfidence(detectedConfidence);
        }
      }
    } catch (err) {
      console.error("Error sending frame to server: ", err);
    }
  };

  useEffect(() => {
    if (intervalId) clearInterval(intervalId);

    const newIntervalId = setInterval(sendFrameToServer, fetchInterval);
    setIntervalId(newIntervalId);

    return () => clearInterval(newIntervalId);
  }, [fetchInterval]);

  const handleIntervalChange = (e) => {
    setFetchInterval(Number(e.target.value));
  };

  const handleClearAll = () => {
    setSentence("");
    setDetections([]);
    setLastConfidence(null);
  };

  const handleClearLast = () => {
    setSentence((prevSentence) => prevSentence.slice(0, -1));
    setDetections((prevDetections) => prevDetections.slice(0, -1));
    setLastConfidence(null);
  };

  const handleAddSpace = () => {
    setSentence((prevSentence) => prevSentence + " ");
  };

  return (
    <div>
      <h1>Real-Time Object Detection</h1>
      <div>
        <h2>Live Feed:</h2>
        <video ref={videoRef} autoPlay playsInline style={{ width: "100%" }} />
      </div>
      <div>
        <h2>Detected Sentence:</h2>
        {lastConfidence !== null && <p>Last Confidence: {lastConfidence}%</p>}
        <p>{sentence}</p>
        <button onClick={handleClearAll}>Clear All</button>
        <button onClick={handleClearLast}>Clear Last Character</button>
        <button onClick={handleAddSpace}>Add Space</button>
      </div>
      <div>
        <h2>Set Fetch Interval:</h2>
        <select onChange={handleIntervalChange} value={fetchInterval}>
          <option value={500}>0.5 seconds</option>
          <option value={1000}>1 second</option>
          <option value={1500}>1.5 seconds</option>
          <option value={2000}>2 seconds</option>
          <option value={3000}>3 seconds</option>
          <option value={5000}>5 seconds</option>
        </select>
      </div>
      <div>
        <h2>Individual Detections:</h2>
        <ul>
          {detections.map((det, index) => (
            <li key={index}>
              {det.class} - {det.confidence}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;