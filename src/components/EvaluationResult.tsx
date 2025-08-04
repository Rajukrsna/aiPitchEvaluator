import React, { useState } from 'react';
import {  X, Trash2, Lightbulb } from 'lucide-react';
import { audioStorage } from '../utils/audioStorage';


interface EvaluationResultProps {
    id: string;
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
    detailedAnalysis?: {
      storytelling: {
        score: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
      };
      audienceConnection: {
        score: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
      };
      persuasiveness: {
        score: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
      };
    };
  } | null;
  overallScore: number | null;
}

const EvaluationResult: React.FC<EvaluationResultProps> = ({ id ,result, overallScore }) => {
  const [activeTab, setActiveTab] = useState<'delivery' | 'engagement'>('delivery');
  const [deleting, setDeleting] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (!result) {
    return <p className="text-lg text-gray-700 text-center">Select a recording to see the result.</p>;
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
       await audioStorage.deleteAudio(id);
      // Refresh the page or redirect after successful deletion
      window.location.reload();
    } catch (error) {
      console.error('Error deleting audio:', error);
      alert('Failed to delete recording. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  
 

  const ProgressBar: React.FC<{ 
    value: number; 
    label: string; 
    detailKey?: 'storytelling' | 'audienceConnection' | 'persuasiveness';
  }> = ({ value, label, detailKey }) => {
    const percentage = (value / 5) * 100; // Convert to percentage out of 5
    const getColor = (val: number) => {
      if (val >= 4) return 'bg-slate-700';
      if (val >= 3) return 'bg-slate-500';
      return 'bg-slate-400';
    };
      // console.log("detailKey",detailKey)
      // console.log("result",result.detailedAnalysis?.[detailKey])
    const toggleDetailCard = () => {
      if (detailKey) {
        setExpandedCard(expandedCard === detailKey ? null : detailKey);
      }
    };

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-slate-700">{label}</span>
            
            {detailKey && result?.detailedAnalysis?.[detailKey] && (
              <button
                onClick={toggleDetailCard}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  expandedCard === detailKey
                    ? 'bg-amber-200 hover:bg-amber-300 text-amber-700'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                }`}
                title="View detailed feedback"
              >
                <Lightbulb size={12} />
              </button>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-800 bg-stone-100 px-2 py-1 rounded-lg">{value}/5</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${getColor(value)}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        {/* Detailed Analysis Cards */}
        {detailKey && expandedCard === detailKey && result?.detailedAnalysis?.[detailKey] && (
          <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
            {/* Feedback Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-blue-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Detailed Feedback
                </h5>
                <button
                  onClick={() => setExpandedCard(null)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-blue-700 text-sm leading-relaxed">
                {result.detailedAnalysis[detailKey].feedback}
              </p>
            </div>

            {/* Improvements Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Improvement Suggestions
              </h5>
              <ul className="space-y-1">
                {result.detailedAnalysis[detailKey].improvements.map((improvement, index) => (
                  <li key={index} className="text-green-700 text-sm flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl relative">
      {/* Delete Button - Top Right */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`absolute top-0 right-0 p-2 rounded-full transition-all duration-200 ${
          deleting 
            ? 'bg-gray-200 cursor-not-allowed' 
            : 'bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700'
        }`}
        title="Delete this recording"
      >
        <Trash2 size={18} className={deleting ? 'animate-pulse' : ''} />
      </button>

      {/* Overall Score */}
      <div className="text-center mb-10">
        <h3 className="text-3xl font-light text-slate-800 mb-6">Evaluation Results</h3>
        <div className="bg-gradient-to-br from-slate-50 to-stone-100 rounded-3xl p-8 shadow-lg border border-stone-200">
          <span className="text-lg font-medium text-slate-600">Overall Score</span>
          <div className="text-6xl font-light text-slate-800 mt-3">
            {overallScore ?? '-'}
            <span className="text-2xl text-slate-500">/10</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full">
        <div className="flex border-b border-stone-200 mb-8">
          <button
            className={`py-4 px-8 font-medium text-lg border-b-2 transition-all duration-200 ${
              activeTab === 'delivery'
                ? 'border-slate-600 text-slate-700 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-600 hover:bg-stone-50'
            }`}
            onClick={() => setActiveTab('delivery')}
          >
            Delivery
          </button>
          <button
            className={`py-4 px-8 font-medium text-lg border-b-2 transition-all duration-200 ${
              activeTab === 'engagement'
                ? 'border-slate-600 text-slate-700 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-600 hover:bg-stone-50'
            }`}
            onClick={() => setActiveTab('engagement')}
          >
            Engagement
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-8 shadow-sm border border-stone-100">
          {activeTab === 'delivery' && (
            <div>
              <h4 className="text-2xl font-medium text-slate-700 mb-6">Delivery Metrics</h4>
              <ProgressBar value={result.delivery.pace} label="Pace"  />
              <ProgressBar value={result.delivery.tone} label="Tone"  />
              <ProgressBar value={result.delivery.clarity} label="Clarity"  />
              <ProgressBar value={result.delivery.confidence} label="Confidence"  />
              <ProgressBar value={result.delivery.enthusiasm} label="Enthusiasm"  />
            </div>
          )}

          {activeTab === 'engagement' && (
            <div>
              <h4 className="text-2xl font-medium text-slate-700 mb-6">Engagement Metrics</h4>
              <ProgressBar value={result.engagement.storytelling} label="Storytelling"  detailKey="storytelling" />
              <ProgressBar value={result.engagement.audienceConnection} label="Audience Connection" detailKey="audienceConnection" />
              <ProgressBar value={result.engagement.persuasiveness} label="Persuasiveness"  detailKey="persuasiveness" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default EvaluationResult;