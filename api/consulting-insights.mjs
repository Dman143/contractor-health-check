import { handleRequest } from '../server/index.mjs';

// Leave room for the optimized 18-second upstream attempt and response handling.
// A retry is only used to recover from a failed transport attempt.
export const maxDuration = 45;

export default handleRequest;
