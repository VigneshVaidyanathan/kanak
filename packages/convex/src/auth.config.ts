// Tells Convex to trust JWTs this deployment signs itself (Convex Auth).
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
