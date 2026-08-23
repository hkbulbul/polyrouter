// Gemini helper functions for translator

import { safeParseJSON } from "../concerns/json.js";
import { OPENAI_BLOCK } from "../schema/index.js";

// Unsupported JSON Schema constraints that should be removed for Antigravity.
// `additionalProperties` handled separately via normalizeAdditionalProperties.
export const GEMINI_UNSUPPORTED_SCHEMA_KEYS = new Set([
  "minLength", "maxLength", "exclusiveMinimum", "exclusiveMaximum",
  "multipleOf", "strict", "encrypted",
  "minItems", "maxItems", "format",
  "default", "examples",
  "$schema", "$id", "$anchor", "$dynamicRef", "$dynamicAnchor", "$vocabulary", "$comment", "$defs", "definitions", "const", "$ref", "ref",
  "propertyNames", "patternProperties", "unevaluatedProperties", "unevaluatedItems", "contains", "minContains", "maxContains", "uniqueItems",
  "anyOf", "oneOf", "allOf", "not",
  "dependencies", "dependentSchemas", "dependentRequired",
  "title", "if", "then", "else", "contentMediaType", "contentEncoding", "contentSchema", "readOnly", "writeOnly",
  "deprecated", "optional",
  "enumDescriptions", "markdownDescription", "markdownEnumDescriptions", "enumItemLabels", "tags",
  "cornerRadius", "fillColor", "fontFamily", "fontSize", "fontWeight", "gap", "padding", "strokeColor", "strokeThickness", "textColor"
]);
export const UNSUPPORTED_SCHEMA_CONSTRAINTS = [...GEMINI_UNSUPPORTED_SCHEMA_KEYS];

// Default safety settings — CIVIC_INTEGRITY excluded: some models reject it with 400 (#5003/#8231)
export const DEFAULT_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
];

// Convert OpenAI content to Gemini parts
export function convertOpenAIContentToParts(content) {
  const parts = [];

  if (typeof content === "string") {
    parts.push({ text: content });
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === OPENAI_BLOCK.TEXT) {
        parts.push({ text: item.text });
      } else if (item.type === OPENAI_BLOCK.IMAGE_URL && item.image_url?.url?.startsWith("data:")) {
        const url = item.image_url.url;
        const commaIndex = url.indexOf(",");
        if (commaIndex !== -1) {
          const mimePart = url.substring(5, commaIndex);
          const data = url.substring(commaIndex + 1);
          const mimeType = mimePart.split(";")[0];
          parts.push({ inlineData: { mime_type: mimeType, data } });
        }
      } else if (item.type === OPENAI_BLOCK.IMAGE_URL && item.image_url?.url && (item.image_url.url.startsWith("http://") || item.image_url.url.startsWith("https://"))) {
        parts.push({ fileData: { fileUri: item.image_url.url, mimeType: "image/*" } });
      } else if (item.type === OPENAI_BLOCK.INPUT_AUDIO && item.input_audio?.data) {
        const format = item.input_audio.format || "wav";
        const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
        parts.push({ inlineData: { mime_type: mimeType, data: item.input_audio.data } });
      } else if (item.type === OPENAI_BLOCK.AUDIO_URL && item.audio_url?.url?.startsWith("data:")) {
        const url = item.audio_url.url;
        const commaIndex = url.indexOf(",");
        if (commaIndex !== -1) {
          const mimePart = url.substring(5, commaIndex);
          const data = url.substring(commaIndex + 1);
          const mimeType = mimePart.split(";")[0];
          parts.push({ inlineData: { mime_type: mimeType, data } });
        }
      } else if (item.type === OPENAI_BLOCK.FILE && item.file?.file_data?.startsWith("data:")) {
        const url = item.file.file_data;
        const commaIndex = url.indexOf(",");
        if (commaIndex !== -1) {
          const mimeType = url.substring(5, commaIndex).split(";")[0];
          const data = url.substring(commaIndex + 1);
          parts.push({ inlineData: { mime_type: mimeType, data } });
        }
      }
    }
  }

  return parts;
}

export function extractTextContent(content, separator = "") {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.filter(c => c.type === OPENAI_BLOCK.TEXT).map(c => c.text).join(separator);
  }
  return "";
}

export function tryParseJSON(str) {
  return safeParseJSON(str, null);
}

export function generateRequestId() {
  return `agent-${crypto.randomUUID()}`;
}

export function generateSessionId() {
  return crypto.randomUUID() + Date.now().toString();
}

export function generateProjectId() {
  const adjectives = ["useful", "bright", "swift", "calm", "bold"];
  const nouns = ["fuze", "wave", "spark", "flow", "core"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${crypto.randomUUID().slice(0, 5)}`;
}

// ─── Schema helpers (ported from OmniRoute geminiHelper.ts 8-phase cleaner) ───

function cloneSchemaValue(value) {
  if (Array.isArray(value)) return value.map(item => cloneSchemaValue(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneSchemaValue(v)]));
  return value;
}
function toRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function decodeJsonPointerSegment(segment) {
  return String(segment).replace(/~1/g, "/").replace(/~0/g, "~");
}
function resolveLocalReference(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return null;
  let current = root;
  const segments = ref.slice(2).split("/").filter(Boolean).map(s => decodeJsonPointerSegment(s));
  for (const segment of segments) {
    const cur = toRecord(current);
    if (!(segment in cur)) return null;
    current = cur[segment];
  }
  return current;
}
function inlineLocalSchemaRefs(node, root, activeRefs = new Set()) {
  if (Array.isArray(node)) return node.map(item => inlineLocalSchemaRefs(item, root, activeRefs));
  if (!node || typeof node !== "object") return node;
  const record = { ...toRecord(node) };
  const ref = typeof record.$ref === "string" ? record.$ref : "";
  if (ref.startsWith("#/$defs/") || ref.startsWith("#/definitions/")) {
    const rest = { ...record };
    delete rest.$ref;
    if (activeRefs.has(ref)) return inlineLocalSchemaRefs(rest, root, activeRefs);
    const resolved = resolveLocalReference(root, ref);
    if (!resolved || typeof resolved !== "object") return inlineLocalSchemaRefs(rest, root, activeRefs);
    activeRefs.add(ref);
    const merged = { ...toRecord(inlineLocalSchemaRefs(cloneSchemaValue(resolved), root, activeRefs)), ...rest };
    activeRefs.delete(ref);
    return inlineLocalSchemaRefs(merged, root, activeRefs);
  }
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, inlineLocalSchemaRefs(v, root, activeRefs)]));
}

function removeUnsupportedKeywords(obj, keywords) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) removeUnsupportedKeywords(item, keywords);
    return;
  }
  const record = obj;
  for (const key of Object.keys(record)) {
    if (keywords.has(key) || key.startsWith("x-")) delete record[key];
  }
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    if (key === "properties" && !Array.isArray(value)) {
      for (const subSchema of Object.values(value)) removeUnsupportedKeywords(subSchema, keywords);
    } else {
      removeUnsupportedKeywords(value, keywords);
    }
  }
}

function normalizeAdditionalProperties(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) normalizeAdditionalProperties(item);
    return;
  }
  const record = obj;
  if ("additionalProperties" in record) delete record.additionalProperties;
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    if (key === "properties" && !Array.isArray(value)) {
      for (const subSchema of Object.values(value)) normalizeAdditionalProperties(subSchema);
    } else {
      normalizeAdditionalProperties(value);
    }
  }
}

function convertConstToEnum(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) convertConstToEnum(item);
    return;
  }
  const record = obj;
  if (record.const !== undefined && !record.enum) {
    record.enum = [record.const];
    delete record.const;
  }
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") continue;
    if (key === "properties" && !Array.isArray(value)) {
      for (const subSchema of Object.values(value)) convertConstToEnum(subSchema);
    } else {
      convertConstToEnum(value);
    }
  }
}

function convertEnumValuesToStrings(obj) {
  if (!obj || typeof obj !== "object") return;
  const record = obj;
  if (record.enum && Array.isArray(record.enum)) {
    if (record.type === "integer" || record.type === "number") {
      delete record.enum;
    } else {
      record.enum = record.enum.map(v => String(v));
      if (!record.type) record.type = "string";
    }
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") convertEnumValuesToStrings(value);
  }
}

function mergeAllOf(obj) {
  if (!obj || typeof obj !== "object") return;
  const record = obj;
  if (record.allOf && Array.isArray(record.allOf)) {
    const merged = {};
    for (const item of record.allOf) {
      const itemRecord = toRecord(item);
      const itemProps = toRecord(itemRecord.properties);
      if (Object.keys(itemProps).length > 0) {
        if (!merged.properties) merged.properties = {};
        Object.assign(merged.properties, itemProps);
      }
      if (itemRecord.required && Array.isArray(itemRecord.required)) {
        if (!merged.required) merged.required = [];
        for (const req of itemRecord.required) {
          if (typeof req === "string" && !merged.required.includes(req)) merged.required.push(req);
        }
      }
    }
    delete record.allOf;
    if (merged.properties) record.properties = { ...toRecord(record.properties), ...merged.properties };
    if (merged.required) {
      const required = Array.isArray(record.required) ? record.required.filter(i => typeof i === "string") : [];
      record.required = [...required, ...merged.required];
    }
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") mergeAllOf(value);
  }
}

function selectBest(items) {
  let bestIdx = 0, bestScore = -1;
  for (let i = 0; i < items.length; i++) {
    const item = toRecord(items[i]);
    let score = 0;
    const type = item.type;
    if (type === "object" || item.properties) score = 3;
    else if (type === "array" || item.items) score = 2;
    else if (type && type !== "null") score = 1;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

function flattenAnyOfOneOf(obj) {
  if (!obj || typeof obj !== "object") return;
  const record = obj;
  if (record.anyOf && Array.isArray(record.anyOf) && record.anyOf.length > 0) {
    const nonNull = record.anyOf.filter(s => s && toRecord(s).type !== "null");
    if (nonNull.length > 0) {
      const bestIdx = selectBest(nonNull);
      const selected = nonNull[bestIdx];
      delete record.anyOf;
      Object.assign(record, toRecord(selected));
    }
  }
  if (record.oneOf && Array.isArray(record.oneOf) && record.oneOf.length > 0) {
    const nonNull = record.oneOf.filter(s => s && toRecord(s).type !== "null");
    if (nonNull.length > 0) {
      const bestIdx = selectBest(nonNull);
      const selected = nonNull[bestIdx];
      delete record.oneOf;
      Object.assign(record, toRecord(selected));
    }
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") flattenAnyOfOneOf(value);
  }
}

function flattenTypeArrays(obj) {
  if (!obj || typeof obj !== "object") return;
  const record = obj;
  if (record.type && Array.isArray(record.type)) {
    const nonNull = record.type.filter(t => t !== "null");
    record.type = nonNull.length > 0 ? nonNull[0] : "string";
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") flattenTypeArrays(value);
  }
}

const GOOGLE_SCHEMA_TYPES = new Set(["string", "number", "integer", "boolean", "array", "object"]);
function normalizeGoogleSchemaTypes(obj) {
  if (!obj || typeof obj !== "object") return;
  if (typeof obj.type === "string") {
    const n = obj.type.toLowerCase();
    if (GOOGLE_SCHEMA_TYPES.has(n)) obj.type = n;
  } else if (Array.isArray(obj.type)) {
    obj.type = obj.type.map(t => {
      const n = typeof t === "string" ? t.toLowerCase() : t;
      return GOOGLE_SCHEMA_TYPES.has(n) ? n : t;
    });
  }
  for (const v of Object.values(obj)) if (v && typeof v === "object") normalizeGoogleSchemaTypes(v);
}

export function normalizeCloudCodeJsonSchema(schema) {
  const normalized = structuredClone(schema || { type: "object", properties: {} });
  coerceStringSchemas(normalized);
  normalizeGoogleSchemaTypes(normalized);
  function removeCloudCodeOnlyFields(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const item of value) removeCloudCodeOnlyFields(item); return; }
    delete value.optional;
    for (const [key, child] of Object.entries(value)) {
      if (!child || typeof child !== "object") continue;
      if (key === "properties" && !Array.isArray(child)) {
        for (const subSchema of Object.values(child)) removeCloudCodeOnlyFields(subSchema);
      } else {
        removeCloudCodeOnlyFields(child);
      }
    }
  }
  removeCloudCodeOnlyFields(normalized);
  return normalized;
}

export function serializeCloudCodeFunctionDeclaration(declaration) {
  const { input_schema, parameters, parametersJsonSchema, ...rest } = declaration;
  return { ...rest, parametersJsonSchema: normalizeCloudCodeJsonSchema(parametersJsonSchema ?? parameters ?? input_schema) };
}

function ensureObjectType(obj) {
  if (!obj || typeof obj !== "object") return;
  if (obj.properties && !obj.type) obj.type = "object";
  for (const v of Object.values(obj)) if (v && typeof v === "object") ensureObjectType(v);
}

function coerceStringSchemas(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    if (Array.isArray(node)) for (const v of node) if (v && typeof v === "object") coerceStringSchemas(v);
    return;
  }
  const rec = node;
  if (rec.properties && typeof rec.properties === "object" && !Array.isArray(rec.properties)) {
    for (const [k, v] of Object.entries(rec.properties)) {
      if (typeof v === "string") {
        const t = v.toLowerCase();
        rec.properties[k] = GOOGLE_SCHEMA_TYPES.has(t) ? { type: t } : { type: "string", description: String(v).slice(0, 200) };
      }
    }
  }
  if (typeof rec.items === "string") {
    const t = rec.items.toLowerCase();
    rec.items = GOOGLE_SCHEMA_TYPES.has(t) ? { type: t } : { type: "string" };
  }
  for (const [key, value] of Object.entries(rec)) {
    if (!value || typeof value !== "object") continue;
    if (key === "properties" && !Array.isArray(value)) {
      for (const subSchema of Object.values(value)) coerceStringSchemas(subSchema);
    } else {
      coerceStringSchemas(value);
    }
  }
}

function normalizeScalarFields(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const v of node) normalizeScalarFields(v); return; }
  const rec = node;
  if ("type" in rec && rec.type != null && typeof rec.type === "object" && !Array.isArray(rec.type)) {
    const inner = rec.type;
    if (inner && typeof inner.type === "string" && GOOGLE_SCHEMA_TYPES.has(inner.type.toLowerCase())) rec.type = inner.type.toLowerCase();
    else if (inner && typeof inner.description === "string") rec.type = "string";
    else rec.type = "string";
  }
  if ("description" in rec && rec.description != null && typeof rec.description !== "string") {
    const d = rec.description;
    if (d && typeof d === "object" && typeof d.description === "string") rec.description = d.description.slice(0, 500);
    else if (d && typeof d === "object" && typeof d.type === "string") rec.description = d.type.slice(0, 500);
    else try { rec.description = JSON.stringify(d).slice(0, 500); } catch { rec.description = String(d).slice(0, 500); }
  }
  if ("title" in rec && rec.title != null && typeof rec.title !== "string") delete rec.title;
  for (const [key, value] of Object.entries(rec)) {
    if (!value || typeof value !== "object") continue;
    if (key === "properties" && !Array.isArray(value)) {
      for (const subSchema of Object.values(value)) normalizeScalarFields(subSchema);
    } else {
      normalizeScalarFields(value);
    }
  }
}

export function cleanJSONSchemaForAntigravity(schema, { addEmptyObjectPlaceholder = true } = {}) {
  if (typeof schema === "string") {
    const t = schema.toLowerCase();
    return GOOGLE_SCHEMA_TYPES.has(t) ? { type: t, properties: t === "object" ? { reason: { type: "string", description: "Brief explanation of why you are calling this tool" } } : undefined, required: t === "object" ? ["reason"] : undefined } : { type: "string" };
  }
  if (!schema || typeof schema !== "object") return schema;
  const root = cloneSchemaValue(schema);
  let cleaned = inlineLocalSchemaRefs(root, root);
  coerceStringSchemas(cleaned);
  normalizeScalarFields(cleaned);
  normalizeGoogleSchemaTypes(cleaned);
  // Phase 1: Convert and prepare
  convertConstToEnum(cleaned);
  convertEnumValuesToStrings(cleaned);
  // Phase 2: Flatten complex structures
  mergeAllOf(cleaned);
  flattenAnyOfOneOf(cleaned);
  flattenTypeArrays(cleaned);
  // Phase 3: additionalProperties
  normalizeAdditionalProperties(cleaned);
  // Phase 4: Remove unsupported keywords (property-aware)
  removeUnsupportedKeywords(cleaned, GEMINI_UNSUPPORTED_SCHEMA_KEYS);
  // Phase 5: Cleanup required
  function cleanupRequired(obj) {
    if (!obj || typeof obj !== "object") return;
    const rec = obj;
    if (rec.required && Array.isArray(rec.required) && rec.properties) {
      const props = toRecord(rec.properties);
      const valid = rec.required.filter(f => typeof f === "string" && Object.prototype.hasOwnProperty.call(props, f));
      if (valid.length === 0) delete rec.required;
      else rec.required = valid;
    }
    for (const v of Object.values(rec)) if (v && typeof v === "object") cleanupRequired(v);
  }
  cleanupRequired(cleaned);
  // A root `{ properties: {} }` is an object schema, not a properties map.
  // Normalize it before placeholder traversal so the empty map is never mutated as a Schema.
  if (!cleaned.type && (cleaned.properties !== undefined || cleaned.required !== undefined)) {
    cleaned.type = "object";
  }
  // Phase 6: Placeholders for empty objects (including bare `{}` which Cloud Code rejects)
  function addPlaceholders(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { for (const item of obj) addPlaceholders(item); return; }
    const rec = obj;
    if (Object.keys(rec).length === 0) {
      rec.type = "object";
      rec.properties = { reason: { type: "string", description: "Brief explanation of why you are calling this tool" } };
      rec.required = ["reason"];
      return;
    }
    if (rec.type === "object" && (!rec.properties || Object.keys(toRecord(rec.properties)).length === 0)) {
      rec.properties = { reason: { type: "string", description: "Brief explanation of why you are calling this tool" } };
      rec.required = ["reason"];
    }
    for (const [key, value] of Object.entries(rec)) {
      if (!value || typeof value !== "object") continue;
      if (key === "properties" && !Array.isArray(value)) {
        for (const subSchema of Object.values(value)) addPlaceholders(subSchema);
      } else {
        addPlaceholders(value);
      }
    }
  }
  if (addEmptyObjectPlaceholder) addPlaceholders(cleaned);
  // Phase 7: Inject missing type:object. Never visit a `properties` map as a schema:
  // a property named `properties` would make us inject `type:"object"` into the map itself.
  function injectObjectType(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { for (const item of obj) injectObjectType(item); return; }
    const rec = obj;
    if (!rec.type && (rec.properties !== undefined || rec.required !== undefined)) rec.type = "object";
    for (const [key, value] of Object.entries(rec)) {
      if (!value || typeof value !== "object") continue;
      if (key === "properties" && !Array.isArray(value)) {
        for (const subSchema of Object.values(value)) injectObjectType(subSchema);
      } else {
        injectObjectType(value);
      }
    }
  }
  injectObjectType(cleaned);
  // Phase 8: Ensure array items
  function ensureArrayItems(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { for (const item of obj) ensureArrayItems(item); return; }
    const rec = obj;
    if (rec.type === "array" && !rec.items) rec.items = { type: "string" };
    for (const v of Object.values(rec)) if (v && typeof v === "object") ensureArrayItems(v);
  }
  ensureArrayItems(cleaned);
  return cleaned;
}

export function normalizeCloudCodeProtoSchema(schema) {
  return cleanJSONSchemaForAntigravity(structuredClone(schema || { type: "object", properties: {} }));
}

export function serializeCloudCodeClaudeFunctionDeclaration(declaration) {
  const { input_schema, parameters, parametersJsonSchema, ...rest } = declaration;
  return { ...rest, parameters: normalizeCloudCodeProtoSchema(parameters ?? input_schema ?? parametersJsonSchema) };
}
