import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { analyzeAudioProperties, saveTemporaryAudioFile, cleanupTempFile } from './audioAnalysis.js';
import { analyzeWithGemini } from './geminiAnalysis.js';
import { transcribeAudio, getAvailableTranscriptionMethods } from './freeTranscription.js';
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Add timestamp to requests for processing time calculation
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Use memory storage for multer since we don't need to save files
const upload = multer({ storage: multer.memoryStorage() });


// Endpoint to get available transcription methods
app.get('/api/transcription-methods', (req, res) => {
  const methods = getAvailableTranscriptionMethods();
  res.json({ methods });
});


// Endpoint to evaluate pitch with AI analysis
app.post('/api/evaluate-pitch', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  console.log('Processing audio file:', req.file.originalname, 'Size:', req.file.size);
  
  let tempFilePath = null;
  
  try {
    // Step 1: Save temporary file (may be needed for some transcription methods)
    tempFilePath = await saveTemporaryAudioFile(req.file.buffer);
    
    // Step 2: Free transcription (defaults to Hugging Face, falls back to offline)
    console.log('Starting free transcription...');
    const transcription = await transcribeAudio(req.file.buffer, 'huggingface');
    console.log('Transcription completed:', transcription.substring(0, 100) + '...');

    // Step 3: Audio analysis for delivery metrics  
    console.log('Analyzing audio properties...');
    const audioMetrics = await analyzeAudioProperties(req.file.buffer);

    // Step 4: Content analysis with Gemini
    console.log('Starting content analysis with Gemini...');
    const contentAnalysis = await analyzeWithGemini(transcription, audioMetrics);

    // Step 5: Combine results
    const result = {
      delivery: {
        pace: audioMetrics.pace,
        tone: audioMetrics.tonalVariation,
        clarity: audioMetrics.clarity,
        confidence: audioMetrics.confidence,
        enthusiasm: audioMetrics.enthusiasm,
      },
      engagement: {
        storytelling: contentAnalysis.storytelling.score,
        audienceConnection: contentAnalysis.audienceConnection.score,
        persuasiveness: contentAnalysis.persuasiveness.score,
      },
      // Additional AI insights
      transcription: transcription,
      detailedAnalysis: contentAnalysis,
      audioMetrics: audioMetrics
    };

    // Calculate overall score based on all metrics
    const deliveryAvg = Object.values(result.delivery).reduce((a, b) => a + b, 0) / Object.values(result.delivery).length;
    const engagementAvg = Object.values(result.engagement).reduce((a, b) => a + b, 0) / Object.values(result.engagement).length;
    const overallScore = Math.round((deliveryAvg + engagementAvg) / 2 * 2); // Scale to 10

    console.log('AI analysis completed successfully');
    
    // Return comprehensive results
    res.json({ 
      result, 
      overallScore,
      success: true,
      processingTime: Date.now() - req.startTime
    });

  } catch (error) {
    console.error('Error during AI analysis:', error);
    
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
