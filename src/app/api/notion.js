import { Client } from "@notionhq/client";
import { getNotionToken } from "@/utils/env";
import {
  extractIconValue,
  getPropertyMultiValues,
  getPropertyValue,
  isFullPage,
} from "@/utils/notionOfficial";

export default async function handler(req, res) {
  try {
    const { databaseId } = req.query;

    if (!databaseId) {
      return res.status(400).json({ error: "Database ID is required" });
    }

    if (!getNotionToken()) {
      return res.status(400).json({ error: "NOTION_TOKEN is required" });
    }

    const notion = new Client({ auth: getNotionToken() });

    const pages = await queryAllPages(notion, databaseId);
    const menuItems = parsePagesToMenuItems(pages);

    res.status(200).json({ menuItems });
  } catch (error) {
    console.error("Error fetching from Notion:", error);
    res.status(500).json({ error: "Failed to fetch data from Notion" });
  }
}

async function queryAllPages(notion, databaseId) {
  const results = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return results;
}

function parsePagesToMenuItems(pages) {
  const menuItems = [];

  for (const page of pages) {
    if (!isFullPage(page)) {
      continue;
    }

    const title = getPropertyValue(page.properties, "title") || "Untitled";
    const description = getPropertyValue(page.properties, "description");
    const href = getPropertyValue(page.properties, "url");
    let avatar = getPropertyValue(page.properties, "avatar");

    if (!avatar) {
      avatar = extractIconValue(page.icon);
    }

    const category = getPropertyValue(page.properties, "category") || "other";
    const roles = getPropertyMultiValues(page.properties, "roles");
    const lanHref = getPropertyValue(page.properties, "lanurl");
    const target = getPropertyValue(page.properties, "target");
    const lastEditedTime = page.last_edited_time
      ? Date.parse(page.last_edited_time)
      : 0;

    if (title && href) {
      menuItems.push({
        id: page.id,
        title: title.trim(),
        description: description.trim(),
        href: href.trim(),
        lanHref: lanHref.trim() || undefined,
        target: target.trim() || undefined,
        avatar: avatar.trim() || undefined,
        roles: (roles.length > 0 ? roles : ["guest"]).map((role) =>
          role.trim()
        ),
        category: category.trim(),
        lastEditedTime,
      });
    }
  }

  return menuItems;
}
