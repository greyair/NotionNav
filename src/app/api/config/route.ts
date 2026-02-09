import { NextResponse } from "next/server";
import type { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NOTION_CONFIG, getNotionClient } from "@/config/notion";
import {
  getPropertyNumber,
  getPropertyRelationIds,
  getPropertyValue,
  getPageTitle,
  isFullPage,
} from "@/utils/notionOfficial";
import { ConfigCategory } from "@/types";

interface SiteConfigResponse {
  siteConfig: Record<string, string>;
  categories: ConfigCategory[];
}

export async function GET() {
  try {
    const databaseId = NOTION_CONFIG.DATABASES.CONFIG;

    if (!databaseId) {
      return NextResponse.json(
        { error: "Config database ID is required" },
        { status: 400 }
      );
    }

    const notion = getNotionClient();
    const pages = await queryAllPages(notion, databaseId);

    const siteConfig: Record<string, string> = {};
    const categories: ConfigCategory[] = [];

    for (const page of pages) {
      if (!isFullPage(page)) {
        continue;
      }

      const type = getPropertyValue(page.properties, "type").toLowerCase();
      const title = getPageTitle(page.properties);

      if (type === "site") {
        const key = getPropertyValue(page.properties, "name") || title;
        const value = getPropertyValue(page.properties, "value");

        if (key) {
          siteConfig[key] = value;
        }

        continue;
      }

      if (type === "category") {
        const name = getPropertyValue(page.properties, "name") || title;
        const order = getPropertyNumber(page.properties, "order");
        const status = getPropertyValue(page.properties, "status") || "active";
        const parentIds = getPropertyRelationIds(page.properties, "parent");

        if (name) {
          categories.push({
            id: page.id,
            name,
            parentId: parentIds[0],
            order: order ?? undefined,
            status,
          });
        }
      }
    }

    const payload: SiteConfigResponse = {
      siteConfig,
      categories,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching config from Notion:", error);
    return NextResponse.json(
      { error: "Failed to fetch config from Notion" },
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
