import fetch from "node-fetch";

/**
 * Analyze transcription and audio metrics with Gemini for content evaluation
 * @param {string} transcriptionText - The transcribed text from Whisper
 * @param {Object} audioMetrics - Audio analysis results
 * @returns {Promise<Object>} Content analysis results
 */
export async function analyzeWithGemini(transcriptionText, audioMetrics) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.error("❌ Missing Gemini API Key! Ensure GEMINI_API_KEY is set in .env");
      return getFallbackAnalysis(transcriptionText, audioMetrics);
    }

    console.log('🟢 Requesting AI Analysis using Gemini for pitch evaluation');

    const prompt = createAnalysisPrompt(transcriptionText, audioMetrics);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (analysisText) {
      console.log("✅ Gemini Analysis Generated Successfully");
      // Parse the structured response from Gemini
      const contentAnalysis = parseGeminiResponse(analysisText);
      console.log('Gemini analysis completed:', contentAnalysis);
      return contentAnalysis;
    } else {
      console.error("❌ No response from Gemini:", data);
      return getFallbackAnalysis(transcriptionText, audioMetrics);
    }
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message || error);
    
    // Return fallback analysis if Gemini fails
    return getFallbackAnalysis(transcriptionText, audioMetrics);
  }
}

/**
 * Create a structured prompt for Gemini analysis
 */
function createAnalysisPrompt(transcriptionText, audioMetrics) {
  return `
Analyze this pitch presentation for storytelling, audience connection, and persuasiveness. 

TRANSCRIPTION:
"${transcriptionText}"

AUDIO METRICS:
- Pace: ${audioMetrics.pace}/5
- Volume: ${audioMetrics.volume}/5  
- Clarity: ${audioMetrics.clarity}/5
- Pause Usage: ${audioMetrics.pauseDuration}/5
- Tonal Variation: ${audioMetrics.tonalVariation}/5
- Confidence: ${audioMetrics.confidence}/5
- Enthusiasm: ${audioMetrics.enthusiasm}/5

Please provide a structured analysis in the following JSON format:

{
  "storytelling": {
    "score": [1-5],
    "feedback": "specific feedback about narrative structure, hook, flow",
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"]
  },
  "audienceConnection": {
    "score": [1-5], 
    "feedback": "feedback about relatability, engagement, empathy",
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"]
  },
  "persuasiveness": {
    "score": [1-5],
    "feedback": "feedback about logical flow, compelling arguments, call to action",
    "strengths": ["strength1", "strength2"], 
    "improvements": ["improvement1", "improvement2"]
  },
  "overallFeedback": "comprehensive summary and key recommendations",
  "keyMessages": ["main message 1", "main message 2"],
  "emotionalTone": "description of emotional tone and effectiveness"
}

Focus on:
1. Storytelling: Narrative structure, hooks, emotional journey, flow
2. Audience Connection: Relatability, addressing pain points, empathy, inclusivity  
3. Persuasiveness: Logical arguments, evidence, compelling case, clear call to action

Consider both the content (transcription) and delivery (audio metrics) in your analysis.
`;
}

/**
 * Parse the structured response from Gemini
 */
function parseGeminiResponse(responseText) {
  try {
    // Extract JSON from the response (Gemini might include extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      const analysis = JSON.parse(jsonString);
      
      // Validate and normalize the response
      return normalizeAnalysis(analysis);
    } else {
      throw new Error('No valid JSON found in Gemini response');
    }
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    console.log('Raw response:', responseText);
    
    // Extract insights manually if JSON parsing fails
    return extractInsightsFromText(responseText);
  }
}

/**
 * Normalize and validate the analysis structure
 */
function normalizeAnalysis(analysis) {
  const normalized = {
    storytelling: {
      score: Math.max(1, Math.min(5, analysis.storytelling?.score || 3)),
      feedback: analysis.storytelling?.feedback || "No specific feedback available",
      strengths: Array.isArray(analysis.storytelling?.strengths) ? analysis.storytelling.strengths : [],
      improvements: Array.isArray(analysis.storytelling?.improvements) ? analysis.storytelling.improvements : []
    },
    audienceConnection: {
      score: Math.max(1, Math.min(5, analysis.audienceConnection?.score || 3)),
      feedback: analysis.audienceConnection?.feedback || "No specific feedback available", 
      strengths: Array.isArray(analysis.audienceConnection?.strengths) ? analysis.audienceConnection.strengths : [],
      improvements: Array.isArray(analysis.audienceConnection?.improvements) ? analysis.audienceConnection.improvements : []
    },
    persuasiveness: {
      score: Math.max(1, Math.min(5, analysis.persuasiveness?.score || 3)),
      feedback: analysis.persuasiveness?.feedback || "No specific feedback available",
      strengths: Array.isArray(analysis.persuasiveness?.strengths) ? analysis.persuasiveness.strengths : [],
      improvements: Array.isArray(analysis.persuasiveness?.improvements) ? analysis.persuasiveness.improvements : []
    },
    overallFeedback: analysis.overallFeedback || "Analysis completed successfully",
    keyMessages: Array.isArray(analysis.keyMessages) ? analysis.keyMessages : [],
    emotionalTone: analysis.emotionalTone || "Neutral tone detected"
  };
  
  return normalized;
}

/**
 * Extract insights from text when JSON parsing fails
 */
function extractInsightsFromText(responseText) {
  // Basic text analysis to extract scores and feedback
  const scoreRegex = /(\d+)\/5|score.*?(\d+)|rating.*?(\d+)/gi;
  const scores = [];
  let match;
  
  while ((match = scoreRegex.exec(responseText)) !== null) {
    const score = parseInt(match[1] || match[2] || match[3]);
    if (score >= 1 && score <= 5) {
      scores.push(score);
    }
  }
  
  return {
    storytelling: {
      score: scores[0] || 3,
      feedback: "Analysis extracted from text response",
      strengths: ["Extracted from AI analysis"],
      improvements: ["See detailed feedback"]
    },
    audienceConnection: {
      score: scores[1] || 3,
      feedback: "Analysis extracted from text response",
      strengths: ["Extracted from AI analysis"], 
      improvements: ["See detailed feedback"]
    },
    persuasiveness: {
      score: scores[2] || 3,
      feedback: "Analysis extracted from text response",
      strengths: ["Extracted from AI analysis"],
      improvements: ["See detailed feedback"]
    },
    overallFeedback: responseText.slice(0, 500) + "...",
    keyMessages: ["Key insights from AI analysis"],
    emotionalTone: "Tone analysis from response"
  };
}

/**
 * Provide fallback analysis when Gemini is unavailable
 */
function getFallbackAnalysis(transcriptionText, audioMetrics) {
  const wordCount = transcriptionText.split(' ').length;
  const hasQuestions = transcriptionText.includes('?');
  const hasEmotionalWords = /excited|passionate|believe|important|amazing/i.test(transcriptionText);
  
  return {
    storytelling: {
      score: wordCount > 50 ? 4 : 3,
      feedback: `Your pitch contains ${wordCount} words. ${wordCount > 50 ? 'Good length for storytelling.' : 'Consider expanding your narrative.'}`,
      strengths: ["Clear communication", "Structured approach"],
      improvements: ["Add more narrative elements", "Include personal examples"]
    },
    audienceConnection: {
      score: hasQuestions ? 4 : 3,
      feedback: hasQuestions ? "Good use of questions to engage audience" : "Consider adding questions to engage your audience",
      strengths: ["Direct communication"],
      improvements: ["Add more audience interaction", "Include relatable examples"]
    },
    persuasiveness: {
      score: hasEmotionalWords ? 4 : 3,
      feedback: hasEmotionalWords ? "Good use of persuasive language" : "Consider adding more compelling language",
      strengths: ["Clear message delivery"],
      improvements: ["Strengthen call to action", "Add supporting evidence"]
    },
    overallFeedback: "Analysis completed using fallback system. For detailed AI insights, ensure Gemini API is configured.",
    keyMessages: ["Main pitch delivered clearly"],
    emotionalTone: hasEmotionalWords ? "Enthusiastic and engaging" : "Professional and measured"
  };
}
