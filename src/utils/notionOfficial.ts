import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialPageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NOTION_PROPERTY_MAPPING } from "@/config/notion";

export type NotionPage = PageObjectResponse | PartialPageObjectResponse;
export type NotionPageProperties = PageObjectResponse["properties"];

type NotionProperty = NotionPageProperties[string];

type NotionIcon = PageObjectResponse["icon"];

type NotionCover = PageObjectResponse["cover"];

type DatabaseProperty = DatabaseObjectResponse["properties"][string];

export function isFullPage(page: NotionPage): page is PageObjectResponse {
  return "properties" in page;
}

export function getPageTitle(properties: NotionPageProperties): string {
  for (const property of Object.values(properties)) {
    if (property.type === "title") {
      return getPlainText(property.title);
    }
  }

  return "";
}

export function getPlainText(items: RichTextItemResponse[] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }

  return items.map((item) => item.plain_text).join("");
}

export function getPropertyNamesForTarget(target: string): string[] {
  const candidates =
    NOTION_PROPERTY_MAPPING[
      target.toUpperCase() as keyof typeof NOTION_PROPERTY_MAPPING
    ] || [];

  return [target, ...candidates];
}

export function findPropertyByNames(
  properties: NotionPageProperties,
  names: string[]
): NotionProperty | undefined {
  const keyMap = new Map<string, string>();

  for (const key of Object.keys(properties)) {
    keyMap.set(key.toLowerCase(), key);
  }

  for (const name of names) {
    const match = keyMap.get(name.toLowerCase());
    if (match) {
      return properties[match];
    }
  }

  return undefined;
}

export function extractPropertyString(property?: NotionProperty): string {
  if (!property) {
    return "";
  }

  switch (property.type) {
    case "title":
      return getPlainText(property.title);
    case "rich_text":
      return getPlainText(property.rich_text);
    case "url":
      return property.url ?? "";
    case "select":
      return property.select?.name ?? "";
    case "multi_select":
      return property.multi_select.map((option) => option.name).join(",");
    case "email":
      return property.email ?? "";
    case "phone_number":
      return property.phone_number ?? "";
    case "number":
      return property.number?.toString() ?? "";
    case "checkbox":
      return property.checkbox ? "true" : "false";
    case "files":
      if (!property.files[0]) {
        return "";
      }

      const file = property.files[0];
      return file.type === "external"
        ? file.external.url
        : "file" in file
        ? file.file.url
        : "";
    default:
      return "";
  }
}

export function getPropertyValue(
  properties: NotionPageProperties,
  target: string
): string {
  const names = getPropertyNamesForTarget(target);
  const property = findPropertyByNames(properties, names);
  return extractPropertyString(property);
}

export function getPropertyMultiValues(
  properties: NotionPageProperties,
  target: string
): string[] {
  const names = getPropertyNamesForTarget(target);
  const property = findPropertyByNames(properties, names);

  if (!property) {
    return [];
  }

  if (property.type === "multi_select") {
    return property.multi_select.map((option) => option.name.trim());
  }

  if (property.type === "select" && property.select?.name) {
    return [property.select.name.trim()];
  }

  const value = extractPropertyString(property);
  if (!value) {
    return [];
  }

  return value.split(",").map((item) => item.trim());
}

export function getPropertyNumber(
  properties: NotionPageProperties,
  target: string
): number | undefined {
  const names = getPropertyNamesForTarget(target);
  const property = findPropertyByNames(properties, names);

  if (!property) {
    return undefined;
  }

  if (property.type === "number") {
    return property.number ?? undefined;
  }

  const value = extractPropertyString(property);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getPropertyRelationIds(
  properties: NotionPageProperties,
  target: string
): string[] {
  const names = getPropertyNamesForTarget(target);
  const property = findPropertyByNames(properties, names);

  if (!property || property.type !== "relation") {
    return [];
  }

  return property.relation.map((relation) => relation.id);
}

export function extractIconValue(icon: NotionIcon): string {
  if (!icon) {
    return "";
  }

  if (icon.type === "emoji") {
    return icon.emoji;
  }

  if (icon.type === "external") {
    return icon.external.url;
  }

  if (icon.type === "file") {
    return icon.file.url;
  }

  return "";
}

export function extractCoverUrl(cover: NotionCover): string {
  if (!cover) {
    return "";
  }

  return cover.type === "external" ? cover.external.url : cover.file.url;
}

export function getCategoryOrder(database: DatabaseObjectResponse): string[] {
  const candidates = getPropertyNamesForTarget("category").map((name) =>
    name.toLowerCase()
  );

  for (const property of Object.values(database.properties)) {
    const prop = property as DatabaseProperty;

    if (prop.name && candidates.includes(prop.name.toLowerCase())) {
      if (prop.type === "select") {
        return prop.select.options.map((option) => option.name);
      }
    }
  }

  return [];
}
