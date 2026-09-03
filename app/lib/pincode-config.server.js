import {
  DEFAULT_PINCODE_CONFIG,
  normalizePincodeConfig,
} from "./pincode.js";

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "pincode_config";

const SHOP_ID_QUERY = `#graphql
  query ShopId {
    shop {
      id
    }
  }
`;

const CONFIG_QUERY = `#graphql
  query PincodeConfig {
    shop {
      id
      metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
        value
      }
    }
  }
`;

const CONFIG_MUTATION = `#graphql
  mutation SavePincodeConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * @param {import("@shopify/shopify-app-react-router/server").AdminApiContext | undefined} admin
 */
export async function getPincodeConfig(admin) {
  if (!admin) {
    return normalizePincodeConfig(DEFAULT_PINCODE_CONFIG);
  }

  try {
    const response = await admin.graphql(CONFIG_QUERY);
    const payload = await response.json();
    const rawValue = payload?.data?.shop?.metafield?.value;

    if (!rawValue) {
      return normalizePincodeConfig(DEFAULT_PINCODE_CONFIG);
    }

    try {
      return normalizePincodeConfig(JSON.parse(rawValue));
    } catch {
      return normalizePincodeConfig(DEFAULT_PINCODE_CONFIG);
    }
  } catch (error) {
    console.error("getPincodeConfig failed, using defaults:", error);
    return normalizePincodeConfig(DEFAULT_PINCODE_CONFIG);
  }
}

/**
 * @param {import("@shopify/shopify-app-react-router/server").AdminApiContext} admin
 * @param {import("./pincode.js").PincodeConfig} config
 */
export async function savePincodeConfig(admin, config) {
  const normalized = normalizePincodeConfig(config);

  const shopResponse = await admin.graphql(SHOP_ID_QUERY);
  const shopPayload = await shopResponse.json();
  const shopId = shopPayload?.data?.shop?.id;

  if (!shopId) {
    throw new Error("Unable to resolve shop ID for metafield save.");
  }

  const response = await admin.graphql(CONFIG_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "json",
          value: JSON.stringify(normalized),
        },
      ],
    },
  });

  const payload = await response.json();
  const userErrors = payload?.data?.metafieldsSet?.userErrors || [];

  if (userErrors.length) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return normalized;
}

export { METAFIELD_NAMESPACE, METAFIELD_KEY };
