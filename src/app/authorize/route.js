import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";

function parseTrae(q){
  const raw = q.get("userJwt");
  if(!raw) return {ok:false,error:"Missing userJwt in callback"};
  let j;
  try{ j=JSON.parse(raw);}catch{ return {ok:false,error:"Malformed userJwt payload"};}
  const token = j.Token;
  if(!token) return {ok:false,error:"userJwt.Token missing"};
  const refresh = j.RefreshToken || q.get("refreshToken") || null;
  const tokenExp = Number(j.TokenExpireAt)||0;
  const refreshExp = Number(j.RefreshExpireAt || q.get("refreshExpireAt"))||0;
  let info={};
  const rawInfo=q.get("userInfo");
  if(rawInfo){ try{ info=JSON.parse(rawInfo);}catch{}}
  const userId = info.UserID || "";
  const region = info.Region || "US-East";
  const userRegion = q.get("userRegion") || "US";
  return {ok:true, record:{
    provider:"trae", authType:"oauth",
    accessToken:token, refreshToken:refresh,
    expiresAt: tokenExp?new Date(tokenExp).toISOString():null,
    email: info.NonPlainTextEmail || null,
    providerSpecificData:{
      userId, tenantId: info.TenantID||"", bizUserId:userId, userUniqueId:userId, webId:userId,
      scope:"marscode-us", tenant:"marscode", region, aiRegion: info.AIRegion||region,
      host: q.get("host")||"https://api-us-east.trae.ai",
      screenName: info.ScreenName||null,
      userRegion,
      clientId: j.ClientID||"en1oxy7wnw8j9n",
      refreshExpireAt: refreshExp||null,
      authMethod:"oauth_callback",
    },
    testStatus:"active"
  }};
}
function htmlClose(msg){
  const safe=JSON.stringify({type:"trae-oauth-callback",...msg}).replace(/</g,"\\u003c");
  const title=msg.success?"Trae authorized":"Trae authorization failed";
  const body=msg.success?"You can close this window.":"Please return to dashboard and try again.";
  return new NextResponse(`<!doctype html><html><body style="font:16px sans-serif;padding:40px"><h2>${title}</h2><p>${body}</p><script>(function(){try{if(!window.opener)return;var m=${safe};var l=location;var t=[l.origin];var a=l.hostname==="127.0.0.1"?"localhost":l.hostname==="localhost"?"127.0.0.1":null;if(a)t.push(l.protocol+"//"+a+(l.port?":"+l.port:""));t.forEach(function(x){try{window.opener.postMessage(m,x)}catch(e){}})}catch(e){}var d=msg.success?800:4000; setTimeout(function(){window.close()},d);})();<\/script></body></html>`,{status:200, headers:{"Content-Type":"text/html; charset=utf-8"}});
}
export async function GET(request){
  const url=new URL(request.url);
  const parsed=parseTrae(url.searchParams);
  if(!parsed.ok) return htmlClose({success:false, error:parsed.error, loginTraceId: url.searchParams.get("loginTraceID")});
  try{
    const conn=await createProviderConnection(parsed.record);
    return htmlClose({success:true, connectionId:conn.id, loginTraceId: url.searchParams.get("loginTraceID")});
  }catch(e){
    return htmlClose({success:false, error:"Internal error during callback", loginTraceId: url.searchParams.get("loginTraceID")});
  }
}
