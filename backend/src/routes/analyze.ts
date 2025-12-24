import { Router, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8001'
const AI_AGENT_TOKEN = process.env.AI_AGENT_TOKEN || 'demo-token'

export const analyze = (router: Router) => {
  /**
   * POST /api/analyze
   * Proxy endpoint to forward image analysis requests to AI Agent
   */
  router.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      // Get the raw body buffer for multipart forwarding
      const contentType = req.headers['content-type'] || ''
      
      if (!contentType.includes('multipart/form-data')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Content-Type must be multipart/form-data'
        })
      }

      // Forward the request to AI Agent using native fetch
      const response = await fetch(`${AI_AGENT_URL}/api/v1/analyze/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_AGENT_TOKEN}`,
          'Content-Type': contentType,
        },
        body: req.body,
        // @ts-ignore - duplex is needed for streaming
        duplex: 'half'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI Agent error:', errorText)
        return res.status(response.status).json({
          error: 'AI Agent request failed',
          details: errorText
        })
      }

      const data = await response.json()
      return res.status(StatusCodes.OK).json(data)
      
    } catch (error) {
      console.error('Proxy error:', error)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to connect to AI Agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/api/health', (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
      status: 'ok',
      service: 'freesight-gateway',
      timestamp: new Date().toISOString()
    })
  })

  /**
   * GET /api/ai-agent/health
   * Check AI Agent health
   */
  router.get('/api/ai-agent/health', async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${AI_AGENT_URL}/api/v1/health`, {
        headers: {
          'Authorization': `Bearer ${AI_AGENT_TOKEN}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return res.status(StatusCodes.OK).json({
          status: 'ok',
          ai_agent: data
        })
      } else {
        return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
          status: 'error',
          message: 'AI Agent not responding'
        })
      }
    } catch (error) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'error',
        message: 'Cannot connect to AI Agent'
      })
    }
  })
}

