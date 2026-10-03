// Vercel Function: every /api/* request is rewritten here (see vercel.json); req.url keeps the original path.
import handler from '../server/serverless.js';

export default handler;
