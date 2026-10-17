import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPricingConfig } from '../command-engine/dialects/sabre-commands/pricing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createPricingRouter(): Router {
  const router = Router();
  const configPath = path.resolve(__dirname, '../pricing-config.json');

  // GET /api/pricing-config
  router.get('/config', (_req: Request, res: Response) => {
    try {
      const config = loadPricingConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read pricing configuration' });
    }
  });

  // POST /api/pricing-config
  router.post('/config', (req: Request, res: Response) => {
    try {
      const newConfig = req.body;
      if (!newConfig || typeof newConfig !== 'object') {
        res.status(400).json({ error: 'Invalid pricing config payload' });
        return;
      }

      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
      res.json({ message: 'Pricing config updated successfully', config: newConfig });
    } catch (err) {
      res.status(500).json({ error: 'Failed to write pricing configuration' });
    }
  });

  return router;
}
