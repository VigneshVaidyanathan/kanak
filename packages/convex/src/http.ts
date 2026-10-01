import { httpRouter } from 'convex/server';
import { chat, chatPreflight } from './aiChat.js';
import { auth } from './auth.js';

const http = httpRouter();

auth.addHttpRoutes(http);

// The AI assistant streams from here rather than from a Next route so that
// OPENROUTER_API_KEY never has to leave the Convex deployment env.
http.route({ path: '/ai/chat', method: 'POST', handler: chat });
http.route({ path: '/ai/chat', method: 'OPTIONS', handler: chatPreflight });

export default http;
