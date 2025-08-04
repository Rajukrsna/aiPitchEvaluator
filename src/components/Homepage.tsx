
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, Square, RotateCcw, TrendingUp, Loader2 } from 'lucide-react';
import axios from 'axios';
import { audioStorage } from '../utils/audioStorage';

const Homepage: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showVoiceCheck, setShowVoiceCheck] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Request microphone permission and show voice check
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setShowVoiceCheck(true);
      setTimeout(() => {
        setShowVoiceCheck(false);
        startCountdown(stream);
      }, 1500); // Show voice check animation for 1.5s
    } catch (err) {
      alert('Microphone permission denied.');
    }
  };

  // Countdown before recording
  const startCountdown = (stream: MediaStream) => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        beginRecording(stream);
      }
    }, 1000);
  };

  // Start recording
  const beginRecording = (stream: MediaStream) => {
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setAudioChunks([]);
    recorder.start();
    setRecording(true);
    let chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
    chunks.push(e.data);
    };

    recorder.onstop = () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    setAudioUrl(URL.createObjectURL(audioBlob));
    };

  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // Upload audio file
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  // Evaluate pitch (send to backend and redirect)
  const handleEvaluatePitch = async () => {
    setUploading(true);
    let audioBlob: Blob | null = null;
    if (audioUrl && audioRef.current) {
      const response = await fetch(audioUrl);
      audioBlob = await response.blob();
    } else if (audioChunks.length > 0) {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    }
    if (!audioBlob) return;
    // save audio to IndexedDB
     const audioId = await audioStorage.saveAudio(
      audioBlob, 
      `Recording ${new Date().toLocaleString()}`
    );


    // Send to backend 
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
   const response = await axios.post('http://localhost:5000/api/evaluate-pitch', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
     await audioStorage.updateAudio(audioId, {
      result: response.data.result,
      overallScore: response.data.overallScore
    });
    navigate('/dashboard',{state: { newAudioId: audioId }}); // Redirect to dashboard with new audio ID
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100 p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-stone-200">
        <h1 className="text-5xl font-light text-slate-800 mb-2 text-center">Audio Pitch Evaluator</h1>
        <p className="text-lg text-slate-600 mb-8 text-center">Record or upload your voice and evaluate your pitch instantly!</p>

        {/* Hero Buttons */}
        {!recording && !audioUrl && !countdown && !showVoiceCheck && (
          <div className="flex flex-col gap-4 w-full items-center">
            <button
              className="px-8 py-4 bg-slate-700 text-white rounded-xl font-medium text-lg shadow-lg hover:bg-slate-800 transition-all duration-200 flex items-center gap-3 w-full justify-center"
              onClick={handleStartRecording}
            >
              <Mic size={20} /> Start Recording
            </button>
            <label className="px-8 py-4 bg-stone-600 text-white rounded-xl font-medium text-lg shadow-lg hover:bg-stone-700 transition-all duration-200 cursor-pointer flex items-center gap-3 w-full justify-center">
              <Upload size={20} /> Upload Audio File
              <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}

        {/* Voice Check Animation */}
        {showVoiceCheck && (
          <div className="flex flex-col items-center mt-8">
            <div className="w-20 h-20 rounded-full bg-slate-200 animate-pulse flex items-center justify-center">
              <Mic size={32} className="text-slate-600" />
            </div>
            <p className="mt-4 text-slate-700 font-medium">Voice check...</p>
          </div>
        )}

        {/* Countdown Animation */}
        {countdown !== null && (
          <div className="flex flex-col items-center mt-8">
            <div className="text-7xl font-light text-slate-700 animate-bounce">{countdown}</div>
            <p className="mt-2 text-slate-600 font-medium">Get ready to record!</p>
          </div>
        )}

        {/* Recording Controls */}
        {recording && (
          <div className="flex flex-col items-center mt-8 gap-4">
            <div className="w-24 h-24 rounded-full bg-red-100 animate-pulse flex items-center justify-center border-4 border-red-300">
              <div className="w-6 h-6 bg-red-600 rounded-full animate-pulse"></div>
            </div>
            <p className="text-red-600 font-medium text-lg">Recording...</p>
            <div className="flex gap-4 mt-4">
              <button
                className="px-6 py-3 bg-slate-600 text-white rounded-xl font-medium hover:bg-slate-700 transition-all duration-200 flex items-center gap-2"
                onClick={handleStopRecording}
              >
                <Square size={16} /> Stop Recording
              </button>
            </div>
          </div>
        )}

        {/* Audio Preview and Evaluate Button after recording or upload */}
        {audioUrl && !recording && (
          <div className="flex flex-col items-center mt-8 gap-4 w-full">
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />
            <div className="flex gap-4 mt-2 w-full">
              <button
                className="flex-1 px-6 py-3 bg-stone-600 text-white rounded-xl font-medium hover:bg-stone-700 transition-all duration-200 flex items-center justify-center gap-2"
                onClick={() => {
                  setAudioUrl(null);
                  setAudioChunks([]);
                }}
              >
                <RotateCcw size={16} /> Record Again
              </button>
               <button
                disabled={uploading}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    uploading ? 'bg-slate-400 cursor-not-allowed text-white' : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
                onClick={handleEvaluatePitch}
                >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Evaluating...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} /> Evaluate Pitch
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;