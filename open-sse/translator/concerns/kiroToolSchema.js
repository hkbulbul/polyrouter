// Kiro accepts a narrow JSON Schema subset for tool inputs. Keep the caller's
// schema intact while reducing modern JSON Schema constructs to that subset.
const ALLOWED_SCHEMA_KEYS = new Set([
  "type", "properties", "required", "items", "description", "title", "enum",
  "minimum", "maximum", "minLength", "maxLength", "pattern", "minItems",
  "maxItems", "uniqueItems", "minProperties", "maxProperties", "format"
]);

function inferType(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value;
}

function mergeSchemas(left, right) {
  const merged = { ...left, ...right };
  if (left.properties || right.properties) {
    merged.properties = { ...(left.properties || {}), ...(right.properties || {}) };
  }
  const required = [...new Set([...(left.required || []), ...(right.required || [])])];
  if (required.length > 0) merged.required = required;
  else delete merged.required;
  return merged;
}

export function sanitizeKiroToolSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object", properties: {} };
  }

  if (Object.keys(schema).length === 0) {
    return { type: "object", properties: {} };
  }

  const sanitize = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;

    let sanitized = {};
    const alternatives = value.allOf || value.anyOf || value.oneOf;
    if (Array.isArray(alternatives)) {
      const branches = alternatives.filter((branch) => {
        const type = branch?.type;
        return type !== "null" && !(Array.isArray(type) && type.every((item) => item === "null"));
      });
      const selected = value.allOf ? branches : branches.slice(0, 1);
      for (const branch of selected) sanitized = mergeSchemas(sanitized, sanitize(branch));
    }

    for (const [key, child] of Object.entries(value)) {
      if (["allOf", "anyOf", "oneOf"].includes(key) || !ALLOWED_SCHEMA_KEYS.has(key)) continue;
      if (key === "properties" && child && typeof child === "object" && !Array.isArray(child)) {
        sanitized.properties = Object.fromEntries(
          Object.entries(child).map(([name, propertySchema]) => [name, sanitize(propertySchema)])
        );
        continue;
      }
      if (key === "items") {
        sanitized.items = Array.isArray(child) ? sanitize(child[0] || {}) : sanitize(child);
        continue;
      }
      if (key === "type" && Array.isArray(child)) {
        const nonNull = child.find((item) => item !== "null");
        if (nonNull) sanitized.type = nonNull;
        continue;
      }
      if (key === "required") {
        const required = Array.isArray(child)
          ? child.filter((item) => typeof item === "string" && item.length > 0)
          : [];
        if (required.length > 0) sanitized.required = required;
        continue;
      }
      sanitized[key] = child;
    }

    if (!sanitized.type) {
      if (sanitized.properties) sanitized.type = "object";
      else if (sanitized.items) sanitized.type = "array";
      else if (sanitized.enum?.length) sanitized.type = inferType(sanitized.enum[0]);
    }
    if (sanitized.type === "object" && !sanitized.properties) sanitized.properties = {};
    return sanitized;
  };

  const sanitized = sanitize(schema);
  return Object.keys(sanitized).length === 0
    ? { type: "object", properties: {} }
    : sanitized;
}

function hashToolName(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function shortenKiroToolName(name, reverseMap) {
  const original = String(name || "tool");
  if (original.length <= 64) return original;
  const shortened = `${original.slice(0, 54)}_${hashToolName(original)}`;
  if (reverseMap) reverseMap[shortened] = original;
  return shortened;
}
