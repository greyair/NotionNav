import { NextRequest, NextResponse } from "next/server";
import type { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NOTION_CONFIG, getNotionClient } from "@/config/notion";
import { getPropertyMultiValues, isFullPage } from "@/utils/notionOfficial";

export async function GET(_request: NextRequest) {
  try {
    const databaseId = NOTION_CONFIG.DEFAULT_DATABASE_ID;
    if (!databaseId) {
      return NextResponse.json(
        { error: "Database ID is required" },
        { status: 400 }
      );
    }

    const notion = getNotionClient();

    const allRoles = await getAllRolesFromDatabase(notion, databaseId);

    return NextResponse.json({
      success: true,
      roles: allRoles,
      totalCount: allRoles.length,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles from Notion" },
      { status: 500 }
    );
  }
}

async function getAllRolesFromDatabase(
  notion: Client,
  databaseId: string
): Promise<string[]> {
  const pages = await queryAllPages(notion, databaseId);
  const roles = new Set<string>();

  for (const page of pages) {
    if (!isFullPage(page)) {
      continue;
    }

    const pageRoles = getPropertyMultiValues(page.properties, "roles");
    for (const role of pageRoles) {
      if (role) {
        roles.add(role);
      }
    }
  }

  return [...roles];
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
