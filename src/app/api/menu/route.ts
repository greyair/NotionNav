import { NextRequest, NextResponse } from "next/server";
import type { Client } from "@notionhq/client";
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NavMenuItem, DatabaseMetadata } from "@/types";
import { NOTION_CONFIG, getNotionClient } from "@/config/notion";
import {
  extractCoverUrl,
  extractIconValue,
  getCategoryOrder,
  getPlainText,
  getPropertyMultiValues,
  getPropertyValue,
  isFullPage,
} from "@/utils/notionOfficial";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId =
      searchParams.get("databaseId") ||
      searchParams.get("pageId") ||
      NOTION_CONFIG.DEFAULT_DATABASE_ID;

    if (!databaseId) {
      return NextResponse.json(
        { error: "Database ID is required" },
        { status: 400 }
      );
    }

    const notion = getNotionClient();

    const database = (await notion.databases.retrieve({
      database_id: databaseId,
    })) as DatabaseObjectResponse;

    const pages = await queryAllPages(notion, databaseId);
    const menuItems = parsePagesToMenuItems(pages);
    const databaseMetadata = extractDatabaseMetadata(database);
    const categoryOrder = getCategoryOrder(database);

    return NextResponse.json({
      menuItems,
      databaseMetadata,
      categoryOrder,
    });
  } catch (error) {
    console.error("Error fetching from Notion:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Notion" },
      { status: 500 }
    );
  }
}

async function queryAllPages(
  notion: Client,
  databaseId: string
): Promise<(PageObjectResponse | PartialPageObjectResponse)[]> {
  const results: (PageObjectResponse | PartialPageObjectResponse)[] = [];
  let cursor: string | undefined = undefined;

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

function parsePagesToMenuItems(
  pages: (PageObjectResponse | PartialPageObjectResponse)[]
): NavMenuItem[] {
  const menuItems: NavMenuItem[] = [];

  for (const page of pages) {
    if (!isFullPage(page)) {
      continue;
    }

    const properties = page.properties;
    const title = getPropertyValue(properties, "title") || "Untitled";
    const description = getPropertyValue(properties, "description");
    const href = getPropertyValue(properties, "url");
    let avatar = getPropertyValue(properties, "avatar");

    if (!avatar) {
      avatar = extractIconValue(page.icon);
    }

    const roles = getPropertyMultiValues(properties, "roles");
    const lanHref = getPropertyValue(properties, "lanurl");
    const target = getPropertyValue(properties, "target");
    const status = getPropertyValue(properties, "status") || "active";
    const category = getPropertyValue(properties, "category") || "其他";
    const lastEditedTime = page.last_edited_time
      ? Date.parse(page.last_edited_time)
      : 0;

    const isActive =
      status === "显示" || status === "active" || status === "Active";

    if (title && href && isActive) {
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
    } else {
      if (!isActive) {
        console.log("Skipping item - status is not active:", status);
      } else {
        console.log("Skipping item - missing title/href");
      }
    }
  }

  return menuItems;
}

function extractDatabaseMetadata(
  database: DatabaseObjectResponse
): DatabaseMetadata {
  const metadata: DatabaseMetadata = {
    title: "导航页",
    icon: "",
    cover: "", // 添加封面字段
  };

  const title = getPlainText(database.title);
  if (title) {
    metadata.title = title;
  }

  metadata.icon = extractIconValue(database.icon);
  metadata.cover = extractCoverUrl(database.cover);

  return metadata;
}
