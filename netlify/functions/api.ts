import serverless from "serverless-http";
import { app } from "../../src/server/app";

// Netlify uses this named export
export const handler = serverless(app);
