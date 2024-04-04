import { getUserManagementApiToken } from "./token";
import { Auth0User } from "./types";

export const getUser = async (sub: string): Promise<Auth0User | undefined> => {
  const token = await getUserManagementApiToken();

  if (!token) {
    console.error("Failed to get or create user management api token");
    return undefined;
  }

  console.log("token user mngmnt api", token);

  // build request
  let headers = new Headers();
  headers.append("Accept", "application/json");
  headers.append("Authorization", `Bearer ${token}`);

  const requestOptions = {
    method: "GET",
    headers,
    redirect: "follow",
  } as RequestInit;

  // send request
  const user = await fetch(
    `https://${
      process.env.AUTH0_DOMAIN
    }/api/v2/users?q=user_id:${encodeURIComponent(sub)}`,
    requestOptions
  )
    .then((response) => response.json())
    .catch((error) => console.log("error", error));

  console.log("retrieved user", user);

  return user?.[0];
};

export const getUserByEmail = async (
  email: string
): Promise<Auth0User | undefined> => {
  const token = await getUserManagementApiToken();

  if (!token) {
    console.error("Failed to get or create user management api token");
    return undefined;
  }

  console.log("token user mngmnt api", token);

  // build request
  let headers = new Headers();
  headers.append("Accept", "application/json");
  headers.append("Authorization", `Bearer ${token}`);

  const requestOptions = {
    method: "GET",
    headers,
    redirect: "follow",
  } as RequestInit;

  // send request
  const user = await fetch(
    `https://a${
      process.env.AUTH0_DOMAIN
    }/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
    requestOptions
  )
    .then((response) => response.json())
    .catch((error) => console.log("error", error));

  console.log("retrieved user", user);

  return user?.[0];
};
