import type { NextFunction, Request, Response } from "express";

export function wellKnown(_: Request, res: Response) {
  res.json({
    authorization_endpoint:
      "https://dependable-star-22-staging.authkit.app/oauth2/authorize",
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    introspection_endpoint:
      "https://dependable-star-22-staging.authkit.app/oauth2/introspection",
    issuer: "https://dependable-star-22-staging.authkit.app",
    registration_endpoint:
      "https://dependable-star-22-staging.authkit.app/oauth2/register",
    scopes_supported: ["email", "offline_access", "openid", "profile"],
    response_modes_supported: ["query"],
    response_types_supported: ["code"],
    token_endpoint:
      "https://dependable-star-22-staging.authkit.app/oauth2/token",
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
  });
}

import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://dependable-star-22-staging.authkit.app/oauth2/jwks"),
);

const WWW_AUTHENTICATE_HEADER = [
  'Bearer error="unauthorized"',
  'error_description="Authorization needed"',
  `resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"`,
].join(", ");

export const bearerTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    return res
      .set("WWW-Authenticate", WWW_AUTHENTICATE_HEADER)
      .status(401)
      .json({ error: "No token provided." });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: "https://dependable-star-22-staging.authkit.app",
    });

    // Use access token claims to populate request context.
    // i.e. `req.userId = payload.sub;`

    next();
  } catch (err) {
    return res
      .set("WWW-Authenticate", WWW_AUTHENTICATE_HEADER)
      .status(401)
      .json({ error: "Invalid bearer token." });
  }
};
