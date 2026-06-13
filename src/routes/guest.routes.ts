// guest.routes.ts

import { Router, Request, Response } from 'express';
import authController from '../controllers/auth.controller';
import { validate, schemas } from '../middleware/validator';
import superAdminController from '../controllers/superAdmin.controller';
import superAdminService from '../services/superAdmin.service';

const router = Router();

router.get('/branches', superAdminController.getBranches);
router.get('/users', superAdminController.getAllUsers);

router.get('/cors-test', (req, res) => {
  res.json({
    origin: req.headers.origin,
    host: req.headers.host
  });
});

// Proxy route to reach the Hugging Face space securely
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'The messages field is required and must be an array.' });
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      console.error('Configuration error: HF_TOKEN is not defined in backend environment variables.');
      return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    const hfResponse = await fetch('https://kaleabbelayhun-abdiragbackend.hf.space/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`
      },
      body: JSON.stringify({ messages })
    });

    if (!hfResponse.ok) {
      const errorMsg = await hfResponse.text();
      console.error('Error from Hugging Face:', errorMsg);
      return res.status(hfResponse.status).json({ error: 'Failed to communicate with Hugging Face Space API' });
    }

    const data = await hfResponse.json();
    return res.json(data);

  } catch (error) {
    console.error('Chat routing error:', error);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
});

router.get('/public-post',async (req: Request, res: Response) => {
  try {
      const PublicPosts = await superAdminService.getPublicPosts();
      res.status(201).json({
        success: true,
        data: PublicPosts,
        message: 'Fetch successful!'
      });
    } catch (error) {
      res.json(error);
    }
});

export default router;