import { handleRequest } from '../server/index.mjs';

// OpenAI report generation can legitimately take around a minute. The route does
// not impose a shorter application deadline; this is only an infrastructure cap.
export const maxDuration = 130;

export default handleRequest;
