import { authenticate } from "../shopify.server.js";
import { getPincodeConfig } from "../lib/pincode-config.server.js";
import { checkPincode } from "../lib/pincode.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode") || "";

  const config = await getPincodeConfig(admin);
  const result = checkPincode(pincode, config);

  return Response.json(result, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export default function PincodeCheckProxy() {
  return null;
}
