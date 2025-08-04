import { HfInference } from '@huggingface/inference';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegStatic);

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY); // Free API key


async function convertToWav(audioBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      const inputPath = path.join(tempDir, `input_${Date.now()}.webm`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);
      
      // Write input buffer to file
      await fs.writeFile(inputPath, audioBuffer);
      
      // Convert to WAV using FFmpeg
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', async () => {
          try {
            const wavBuffer = await fs.readFile(outputPath);
            // Clean up temp files
            await fs.remove(inputPath);
            await fs.remove(outputPath);
            resolve(wavBuffer);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        })
        .save(outputPath);
        
    } catch (error) {
      reject(error);
    }
  });
}


export async function transcribeWithHuggingFaceHTTP(audioBuffer) {
  try {
    console.log('Starting transcription with Hugging Face HTTP API...');
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY not configured');
    }
    
    // Convert to WAV for better compatibility
    console.log('Converting audio to WAV format...');
    const wavBuffer = await convertToWav(audioBuffer);
    
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'audio/wav',
        },
        body: wavBuffer,
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Hugging Face HTTP transcription completed:', result.text.substring(0, 100) + '...');
    return result.text;
    
  } catch (error) {
    console.error('Hugging Face HTTP transcription failed:', error);
    throw error;
  }
}

/**
 * Transcribe audio using Hugging Face Whisper models (FREE)
 * @param {Buffer} audioBuffer - The audio file buffer
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeWithHuggingFace(audioBuffer) {
  // Try multiple approaches in order of preference
  
  // 1. Try HTTP API with WAV conversion (best quality)
  try {
    return await transcribeWithHuggingFaceHTTP(audioBuffer);
  } catch (httpError) {
    console.log('HTTP method with conversion failed, trying simple method...');
    
    // 2. Try simple method without conversion (faster)
    try {
      return await transcribeWithHuggingFaceSimple(audioBuffer);
    } catch (simpleError) {
      console.log('Simple method failed, trying SDK method...');
      
      // 3. Try SDK method with conversion (last resort)
      let tempFilePath = null;
      
      try {
        console.log('Starting transcription with Hugging Face SDK...');
        
        // Convert to WAV format first
        console.log('Converting audio to WAV for SDK...');
        const wavBuffer = await convertToWav(audioBuffer);
        
        // Save WAV buffer to temporary file for HuggingFace API
        const tempDir = path.join(__dirname, 'temp');
        await fs.ensureDir(tempDir);
        tempFilePath = path.join(tempDir, `hf_audio_${Date.now()}.wav`);
        await fs.writeFile(tempFilePath, wavBuffer);
        
        // Create a readable stream for HuggingFace
        const audioStream = fs.createReadStream(tempFilePath);
        
        // Use Whisper model on Hugging Face (completely free)
        const response = await hf.automaticSpeechRecognition({
          data: audioStream,
          model: "openai/whisper-large-v3" // Free Whisper model
        });
        
        console.log('Hugging Face SDK transcription completed:', response.text.substring(0, 100) + '...');
        return response.text;
        
      } catch (sdkError) {
        console.error('All HuggingFace methods failed');
        throw new Error(`All transcription methods failed: ${sdkError.message}`);
      } finally {
        // Clean up temp file
        if (tempFilePath && await fs.pathExists(tempFilePath)) {
          await fs.remove(tempFilePath);
        }
      }
    }
  }
}

export async function transcribeWithHuggingFaceSimple(audioBuffer) {
  try {
    console.log('Trying simple Hugging Face transcription...');
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY not configured');
    }
    
    // Try with a smaller, more compatible model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-tiny',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        body: audioBuffer,
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Simple HuggingFace API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Simple Hugging Face transcription completed:', result.text.substring(0, 100) + '...');
    return result.text;
    
  } catch (error) {
    console.error('Simple Hugging Face transcription failed:', error);
    throw error;
  }
}


export function getWebSpeechTranscription() {
  return `
  // Frontend implementation for Web Speech API
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    console.log('Transcription:', transcript);
  };
  `;
}

/**
 * Simple speech-to-text using pattern recognition (Offline, FREE)
 * This is a very basic implementation for demo purposes
 */

/**
 * Main transcription function with fallback options
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} method - Transcription method ('huggingface', 'offline', 'openai')
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBuffer, method = 'huggingface') {
  console.log(`Starting transcription using method: ${method}`);
  
  try {
    switch (method) {
      case 'huggingface':
        return await transcribeWithHuggingFace(audioBuffer);
      
      default:
        throw new Error(`Unknown transcription method: ${method}`);
    }
  } catch (error) {
    console.error(`Transcription failed with method ${method}:`, error);
    
  }
}

/**
 * Get available transcription methods based on configuration
 */
export function getAvailableTranscriptionMethods() {
  const methods = [];
  
  // Check if Hugging Face is configured
  if (process.env.HUGGINGFACE_API_KEY) {
    methods.push({
      id: 'huggingface',
      name: 'Hugging Face Whisper',
      cost: 'Free (rate limited)',
      accuracy: 'High',
      description: 'Free Whisper model via Hugging Face'
    });
  }
  

  
  return methods;
}
