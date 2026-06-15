import app from './app';
import { config } from './config';
import { startActiveSimulations } from './services/liveSimulator';

app.listen(config.port, () => {
  console.log(`[LiveCommerceHub] Server running on http://localhost:${config.port}`);
  startActiveSimulations().catch((err) => {
    console.error('[LiveCommerceHub] Failed to preload active live simulations', err);
  });
});
