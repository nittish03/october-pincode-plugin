import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
