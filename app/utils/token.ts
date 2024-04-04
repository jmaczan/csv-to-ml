import { jwtDecode } from "jwt-decode";
import { kv } from "@vercel/kv";

interface DecodedJwt {
  exp?: number;
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: DecodedJwt = jwtDecode(token);
    if (typeof decoded.exp === "number") {
      return decoded.exp * 1000 < Date.now();
    }
    // Token does not have an expiration time
    return false;
  } catch (error) {
    // Handle decoding error (e.g., malformed token)
    console.error("Error decoding token:", error);
    return true; // Assume expired or invalid if there's an error
  }
};

export const getUserManagementApiToken = async (): Promise<
  string | undefined
> => {
  let token: string | undefined | null = await getCachedToken(); // Implement caching logic with Vercel KV

  if (!token || isTokenExpired(token)) {
    // TODO: temporary hack, remove
    token = await fetchNewToken(); // Contains logic to get new token from Auth0
    if (!token) {
      return undefined;
    }
    await cacheToken(token); // Implement caching logic with Vercel KV
  }

  return token;
};

export async function fetchNewToken(): Promise<string | undefined> {
  const url = `https://${process.env.AUTH0_DOMAIN}/oauth/token`;
  const payload = {
    client_id: process.env.AUTH0_MANAGEMENT_API_CLIENT_ID,
    client_secret: process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
    audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    grant_type: "client_credentials",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.log("response", response);
    return undefined;
  }

  const data = await response.json();
  console.log("data", data);
  return data.access_token;
}

// Function to cache the token using Vercel KV
export async function cacheToken(token: string): Promise<string | null> {
  return await kv.set("auth0_token", token, { ex: 3600 }); // Set with a 1-hour expiry
}

// Function to get the cached token
export async function getCachedToken(): Promise<string | null> {
  return await kv.get("auth0_token");
}
