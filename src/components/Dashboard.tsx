
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, BarChart3, Plus, Mic, Loader2 } from 'lucide-react';
import EvaluationResult from './EvaluationResult'; 
import { useNavigate } from 'react-router-dom';
import { audioStorage } from '../utils/audioStorage';

// Assuming you have a component to display evaluation results
interface DashboardAudioRecord {
  id: string;
  name: string;
  url: string;
  result?: string;
  overallScore?: number;
}

interface AudioEvaluationResult {
  result: {
    delivery: {
      pace: number;
      tone: number;
      clarity: number;
      confidence: number;
      enthusiasm: number;
    };
    engagement: {
      storytelling: number;
      audienceConnection: number;
      persuasiveness: number;
    };
  };
  overallScore: number;
}

const Dashboard: React.FC = () => {
  const [audioList, setAudioList] = useState<DashboardAudioRecord[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<DashboardAudioRecord | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [firstTimeLoading, setFirstTimeLoading] = useState(true);
  const [evaluationResult, setEvaluationResult] = useState<AudioEvaluationResult['result'] | null>(null);
  const [overallScore, setOverallScore] = useState<AudioEvaluationResult['overallScore'] | null>(null);
  const [isProcessingNewAudio, setIsProcessingNewAudio] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  const location = useLocation();
  const newAudioId = location.state?.newAudioId || null;
  const navigate = useNavigate();

  // Simulate fetching audio list from backend
  useEffect(() => {
    // Replace with real backend call
    
    const fetchAudioList = async () => {
      try {
       const records = await audioStorage.getAllAudio();
       console.log("Fetched audio records:", records);
       const audioList = records.map(record => ({
        id: record.id,
        name: record.name,
        url: audioStorage.createAudioUrl(record.audioBlob),
        result: record.result,
        overallScore: record.overallScore
      }));
        setAudioList(audioList);
      } catch (error) {
        console.error('Error fetching audio list:', error);
      }
    };
    fetchAudioList();
  }, []);

   useEffect(() => {
    console.log("hey i am firsttimeloading", firstTimeLoading);
    if (newAudioId && audioList.length > 0 && firstTimeLoading) {
    const matched = audioList.find(audio => audio.id === newAudioId);
    if (matched) {
      setSelectedAudio(matched);
      setShowResult(true);
      setIsProcessingNewAudio(true); // Start processing
      setLoadingResult(true);

      // Simulate waiting for backend (e.g., 1 minute or until backend responds)
      const timer = setTimeout(async () => {
        const record2 = await audioStorage.getAudio(newAudioId);
        if(record2 && record2.result) {
          console.log("Fetched evaluation result for new audio:", record2.result);
          setEvaluationResult(record2.result);
          setOverallScore(record2.overallScore || null);
          setLoadingResult(false);
          setIsProcessingNewAudio(false);
          setFirstTimeLoading(false);
        }
        
     
      }, 7000); // Change 3000 to 60000 for 1 minute

      return () => clearTimeout(timer);
    }
  }
}, [newAudioId, audioList, firstTimeLoading]);

  const handleShowResult = async(audio: DashboardAudioRecord) => {
    setSelectedAudio(audio);
    setShowResult(true);
    setLoadingResult(true);
    setIsProcessingNewAudio(false); // Not a new audio

    try {
      const record = await audioStorage.getAudio(audio.id);  
      console.log("hdiuofhds",record?.result)
     setLoadingResult(false);
      if (record?.result) {
      setEvaluationResult(record.result);
      setOverallScore(record.overallScore || null);
    } 
}catch (error) {
    console.error('Error loading result:', error);
  } finally {
    setLoadingResult(false);
  }
  };

  const handlePlayAudio = (audio: DashboardAudioRecord) => {
    // If this audio is currently playing, pause it
    if (currentlyPlayingId === audio.id && currentAudioElement) {
      currentAudioElement.pause();
      setCurrentlyPlayingId(null);
      setCurrentAudioElement(null);
      return;
    }

    // If another audio is playing, stop it first
    if (currentAudioElement) {
      currentAudioElement.pause();
      setCurrentAudioElement(null);
    }

    // Start playing the new audio
    console.log("Playing audio:", audio.url);
    const audioEl = new Audio(audio.url);
    audioEl.play();
    setCurrentlyPlayingId(audio.id);
    setCurrentAudioElement(audioEl);

    // Handle when audio ends naturally
    audioEl.addEventListener('ended', () => {
      setCurrentlyPlayingId(null);
      setCurrentAudioElement(null);
    });
  };

  const handleTakeRecordingAgain = () => {
    // Placeholder for navigation or UI to record/upload again
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Left: Audio List */}
      <div className="w-1/3 max-w-sm bg-white border-r border-stone-200 p-6 flex flex-col shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Your Recordings</h2>
        <div className="flex-1 overflow-hidden">
          <ul className="space-y-3 overflow-y-auto max-h-[calc(100vh-160px)] pr-2 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100">
            {audioList.map((audio) => (
              <li key={audio.id} className="group bg-gradient-to-r from-slate-50 to-stone-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-stone-200 hover:border-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-800 truncate flex-1">{audio.name}</span>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1 ${
                      currentlyPlayingId === audio.id 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                    onClick={() => handlePlayAudio(audio)}
                  >
                    {currentlyPlayingId === audio.id ? (
                      <>
                        <Pause size={14} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Play
                      </>
                    )}
                  </button>
                  <button
                    className="flex-1 px-3 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                    onClick={() => handleShowResult(audio)}
                  >
                    <BarChart3 size={14} /> Results
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: Evaluation Result */}
      <div className="flex-1 p-8 flex flex-col items-center justify-start">
        <button
          className="self-end mb-6 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
          onClick={handleTakeRecordingAgain}
        >
          <Plus size={18} /> New Recording
        </button>

    {showResult ? (
  <div className="w-full max-w-4xl min-h-[400px] bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 border border-stone-200">
    {loadingResult && isProcessingNewAudio ? (
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-slate-200 to-stone-200 animate-pulse flex items-center justify-center mb-6">
          <Loader2 size={32} className="text-slate-600 animate-spin" />
        </div>
        <p className="text-xl text-slate-700 font-medium text-center">
          Processing your audio evaluation...
        </p>
        <p className="text-sm text-slate-500 mt-2">This may take a moment</p>
      </div>
    ) : (
      <EvaluationResult 
        id={selectedAudio?.id || ''}
        result={evaluationResult}
        overallScore={overallScore}
      />
    )}
  </div>
) : (
  <div className="text-center mt-20">
    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-slate-100 to-stone-100 flex items-center justify-center">
      <Mic size={32} className="text-slate-400" />
    </div>
    <p className="text-slate-500 text-lg">
      Select a recording to see the evaluation results
    </p>
  </div>
)}
    </div>
    </div>
  );
};

export default Dashboard;
