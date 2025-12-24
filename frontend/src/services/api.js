/**
 * FreeSight API Service
 * Handles communication with the backend gateway
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Analyze an image frame for object detection and navigation guidance
 * @param {Blob} imageBlob - The image to analyze
 * @returns {Promise<AnalyzeResponse>}
 */
export async function analyzeImage(imageBlob) {
  const formData = new FormData();
  formData.append('file', imageBlob, 'frame.jpg');

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.details || error.error || `Analysis failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check backend health
 * @returns {Promise<{status: string, service: string}>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend not available');
  }
  return response.json();
}

/**
 * Check AI Agent health through backend
 * @returns {Promise<{status: string, ai_agent: object}>}
 */
export async function checkAIAgentHealth() {
  const response = await fetch(`${API_BASE_URL}/api/ai-agent/health`);
  if (!response.ok) {
    throw new Error('AI Agent not available');
  }
  return response.json();
}

/**
 * Get analytics data
 * @returns {Promise<object>}
 */
export async function getAnalytics() {
  const response = await fetch(`${API_BASE_URL}/api/analytics`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

export default {
  analyzeImage,
  checkHealth,
  checkAIAgentHealth,
  getAnalytics,
};

