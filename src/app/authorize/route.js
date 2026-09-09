import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";

function parseJsonObject(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function parseTrae(q) {
  // Trae has used both top-level callback fields and a newer `data` JSON
  // envelope. Accept either shape, including a nested `data.data` object.
  const envelope = parseJsonObject(q.get("data")) || {};
  const nested = parseJsonObject(envelope.data) || {};
  const getValue = (...names) => {
    for (const name of names) {
      const value = q.get(name) ?? nested[name] ?? envelope[name];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  };

  const rawJwt = getValue("userJwt", "UserJwt", "user_jwt");
  const jwt = parseJsonObject(rawJwt);
  if (!rawJwt) return { ok: false, error: "Missing userJwt in callback" };
  if (!jwt) return { ok: false, error: "Malformed userJwt payload" };

  const token = jwt.Token || jwt.token || jwt.AccessToken || jwt.accessToken;
  if (!token) return { ok: false, error: "userJwt.Token missing" };

  const refresh = jwt.RefreshToken || jwt.refreshToken || getValue("refreshToken", "refresh_token") || null;
  const tokenExp = Number(jwt.TokenExpireAt || jwt.tokenExpireAt || jwt.ExpiresAt || 0) || 0;
  const refreshExp = Number(jwt.RefreshExpireAt || jwt.refreshExpireAt || getValue("refreshExpireAt")) || 0;
  const info = parseJsonObject(getValue("userInfo", "UserInfo", "user_info")) || {};
  const userId = info.UserID || info.userId || "";
  const region = info.Region || info.region || "US-East";
  const userRegion = getValue("userRegion", "user_region") || "US";

  return { ok: true, loginTraceId: getValue("loginTraceID", "loginTraceId", "login_trace_id"), record: {
    provider: "trae", authType: "oauth",
    accessToken: token, refreshToken: refresh,
    expiresAt: tokenExp ? new Date(tokenExp).toISOString() : null,
    email: info.NonPlainTextEmail || info.email || null,
    providerSpecificData: {
      userId, tenantId: info.TenantID || info.tenantId || "", bizUserId: userId, userUniqueId: userId, webId: userId,
      scope: "marscode-us", tenant: "marscode", region, aiRegion: info.AIRegion || info.aiRegion || region,
      host: getValue("host") || "https://api-us-east.trae.ai",
      screenName: info.ScreenName || info.screenName || null,
      userRegion,
      clientId: jwt.ClientID || jwt.clientId || "en1oxy7wnw8j9n",
      refreshExpireAt: refreshExp || null,
      authMethod: "oauth_callback",
    },
    testStatus: "active"
  }};
}
function htmlClose(msg){
  const safe=JSON.stringify({type:"trae-oauth-callback",...msg}).replace(/</g,"\\u003c");
  const title=msg.success?"Trae authorized":"Trae authorization failed";
  const body=msg.success?"You can close this window.":"Please return to dashboard and try again.";
  return new NextResponse(`<!doctype html><html><body style="font:16px sans-serif;padding:40px"><h2>${title}</h2><p>${body}</p><script>(function(){try{if(!window.opener)return;var m=${safe};var l=location;var t=[l.origin];var a=l.hostname==="127.0.0.1"?"localhost":l.hostname==="localhost"?"127.0.0.1":null;if(a)t.push(l.protocol+"//"+a+(l.port?":"+l.port:""));t.forEach(function(x){try{window.opener.postMessage(m,x)}catch(e){}})}catch(e){}var d=m.success?800:4000; setTimeout(function(){window.close()},d);})();<\/script></body></html>`,{status:200, headers:{"Content-Type":"text/html; charset=utf-8"}});
}
export async function GET(request){
  const url=new URL(request.url);
  const parsed=parseTrae(url.searchParams);
  const loginTraceId = parsed.loginTraceId || url.searchParams.get("loginTraceID") || url.searchParams.get("loginTraceId");
  if(!parsed.ok) return htmlClose({success:false, error:parsed.error, loginTraceId});
  try{
    const conn=await createProviderConnection(parsed.record);
    return htmlClose({success:true, connectionId:conn.id, loginTraceId});
  }catch(e){
    return htmlClose({success:false, error:"Internal error during callback", loginTraceId});
  }
}
