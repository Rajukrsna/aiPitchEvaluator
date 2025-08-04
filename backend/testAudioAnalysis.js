import { analyzeAudioProperties } from './audioAnalysis.js';

// Test the audio analysis with a sample buffer
async function testAudioAnalysis() {
  console.log('Testing real audio analysis...');
  
  // Create a mock audio buffer for testing
  const sampleRate = 44100;
  const duration = 2; // 2 seconds
  const bufferLength = sampleRate * duration * 2; // 16-bit samples
  const testBuffer = Buffer.alloc(bufferLength);
  
  // Fill with some sample audio data (sine wave)
  for (let i = 0; i < bufferLength; i += 2) {
    const sample = Math.sin(2 * Math.PI * 440 * (i / 2) / sampleRate) * 0.5; // 440Hz tone
    const intSample = Math.floor(sample * 32767);
    testBuffer.writeInt16LE(intSample, i);
  }
  
  try {
    const results = await analyzeAudioProperties(testBuffer);
    console.log('Audio analysis results:', results);
    console.log('✅ Audio analysis test passed!');
  } catch (error) {
    console.error('❌ Audio analysis test failed:', error);
  }
}

// Run the test
testAudioAnalysis();
