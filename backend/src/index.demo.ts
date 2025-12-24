/**
 * FreeSight Demo Backend
 * Simplified API gateway for demo purposes - no MongoDB/Redis required
 */

import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { join } from 'path'
import 'dotenv/config'

const app: Express = express()

// CORS configuration for demo - allow all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Environment configuration
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001'
const AI_AGENT_TOKEN = process.env.AI_AGENT_TOKEN || 'demo-token'
const APP_PORT = process.env.APP_PORT || 8000

// Simple in-memory analytics for demo
interface AnalyticsData {
  totalScans: number
  successfulScans: number
  failedScans: number
  panicEvents: number
  lastScanTime: string | null
}

const analytics: AnalyticsData = {
  totalScans: 0,
  successfulScans: 0,
  failedScans: 0,
  panicEvents: 0,
  lastScanTime: null
}

/**
 * POST /api/analyze
 * Main endpoint - forwards image to AI Agent and returns analysis
 * This must come BEFORE express.json() middleware
 */
app.post('/api/analyze', express.raw({ type: '*/*', limit: '50mb' }), async (req: Request, res: Response) => {
  analytics.totalScans++
  
  try {
    const contentType = req.headers['content-type'] || ''
    const body = req.body as Buffer
    
    if (!body || body.length === 0) {
      analytics.failedScans++
      return res.status(400).json({
        error: 'No image data received'
      })
    }

    console.log(`[Analyze] Forwarding ${body.length} bytes to AI Agent...`)
    
    const response = await fetch(`${AI_AGENT_URL}/api/v1/analyze/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_AGENT_TOKEN}`,
        'Content-Type': contentType,
      },
      body: body
    })

    if (!response.ok) {
      analytics.failedScans++
      const errorText = await response.text()
      console.error('[Analyze] AI Agent error:', response.status, errorText)
      return res.status(response.status).json({
        error: 'Analysis failed',
        details: errorText
      })
    }

    const data = await response.json()
    
    analytics.successfulScans++
    analytics.lastScanTime = new Date().toISOString()
    
    if (data.panic) {
      analytics.panicEvents++
    }
    
    console.log(`[Analyze] Success - ${data.detections?.length || 0} objects detected`)
    return res.json(data)
    
  } catch (error) {
    analytics.failedScans++
    console.error('[Analyze] Proxy error:', error)
    return res.status(500).json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Parse JSON bodies for other routes
app.use(express.json({ limit: '10mb' }))

// Serve static files if needed
app.use(
  join('/', process.env.STORAGE_PATH || 'storage'),
  express.static(join(__dirname, process.env.STORAGE_PATH || 'storage'))
)

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'freesight-gateway',
    mode: 'demo',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

/**
 * GET /api/analytics
 * Get demo analytics
 */
app.get('/api/analytics', (_req: Request, res: Response) => {
  res.json({
    ...analytics,
    successRate: analytics.totalScans > 0 
      ? ((analytics.successfulScans / analytics.totalScans) * 100).toFixed(1) + '%'
      : 'N/A'
  })
})

/**
 * GET /api/ai-agent/health
 * Check AI Agent connectivity
 */
app.get('/api/ai-agent/health', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${AI_AGENT_URL}/api/v1/health`, {
      headers: { 'Authorization': `Bearer ${AI_AGENT_TOKEN}` },
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      return res.json({ status: 'connected', ai_agent: data })
    }
    
    return res.status(503).json({ 
      status: 'error', 
      message: 'AI Agent returned error' 
    })
  } catch (error) {
    return res.status(503).json({ 
      status: 'disconnected', 
      message: 'Cannot reach AI Agent',
      ai_agent_url: AI_AGENT_URL
    })
  }
})

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(APP_PORT, () => {
  console.log(`🚀 FreeSight Gateway running on port ${APP_PORT}`)
  console.log(`📡 AI Agent URL: ${AI_AGENT_URL}`)
  console.log(`🔧 Mode: Demo`)
})
