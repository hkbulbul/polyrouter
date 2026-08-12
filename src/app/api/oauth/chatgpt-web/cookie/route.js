import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_COOKIE_DOMAINS = ["chatgpt.com", "openai.com"];

function isAllowedCookieDomain(domain) {
  const normalized = domain.replace(/^\./, "").toLowerCase();
  return ALLOWED_COOKIE_DOMAINS.some(
    (allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`)
  );
}

function normalizeSameSite(sameSite) {
  switch (sameSite) {
    case "strict":
      return "Strict";
    case "lax":
      return "Lax";
    case "no_restriction":
      return "None";
    default:
      return undefined;
  }
}

function normalizeCookie(cookie) {
  if (
    !cookie ||
    typeof cookie.name !== "string" ||
    typeof cookie.value !== "string" ||
    typeof cookie.domain !== "string" ||
    !isAllowedCookieDomain(cookie.domain)
  ) {
    return null;
  }

  const normalized = {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: typeof cookie.path === "string" ? cookie.path : "/",
    httpOnly: Boolean(cookie.httpOnly),
    secure: Boolean(cookie.secure),
  };

  const sameSite = normalizeSameSite(cookie.sameSite);
  if (sameSite) normalized.sameSite = sameSite;

  if (Number.isFinite(cookie.expirationDate) && cookie.expirationDate > 0) {
    normalized.expires = cookie.expirationDate;
  }

  const partitionKey = cookie.partitionKey?.topLevelSite;
  if (typeof partitionKey === "string" && partitionKey.length > 0) {
    normalized.partitionKey = partitionKey;
  }

  return normalized;
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body?.provider !== "chatgpt-web" || !Array.isArray(body.cookies)) {
      return NextResponse.json(
        { error: "A ChatGPT cookie export from PolyRouter Connector is required" },
        { status: 400 }
      );
    }

    if (body.cookies.length === 0 || body.cookies.length > 500) {
      return NextResponse.json(
        { error: "The connector returned an invalid cookie set" },
        { status: 400 }
      );
    }

    const cookies = body.cookies.map(normalizeCookie).filter(Boolean);
    if (cookies.length === 0) {
      return NextResponse.json(
        { error: "No supported ChatGPT or OpenAI cookies were found" },
        { status: 400 }
      );
    }

    const cookieString = cookies
      .filter((cookie) => isAllowedCookieDomain(cookie.domain))
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const connection = await createProviderConnection({
      provider: "chatgpt-web",
      authType: "cookie",
      name: `ChatGPT Web ${new Date().toLocaleString("en-CA")}`,
      email: null,
      apiKey: cookieString,
      providerSpecificData: {
        sessionCookies: cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          partitionKey: cookie.partitionKey,
        })),
      },
      testStatus: "active",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      connection: { id: connection.id, provider: connection.provider },
    });
  } catch (error) {
    console.error("ChatGPT Web cookie import error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to import the ChatGPT session" },
      { status: 500 }
    );
  }
}
