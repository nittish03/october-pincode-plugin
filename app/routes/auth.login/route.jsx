import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { login } from "../../shopify.server.js";
import { loginErrorMessage } from "./error.server.js";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
          <s-section heading="Log in to October Pincode">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="octoberstore-2.myshopify.com"
              value={shop}
              onChange={(event) => setShop(event.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            />
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
