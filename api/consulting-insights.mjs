import { handleRequest } from '../server/index.mjs';

// Two 60-second upstream attempts plus response handling require a function window
// longer than Vercel's common default.
export const maxDuration = 130;

export default handleRequest;
