import { NextRequest, NextResponse } from "next/server";
import type { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NOTION_CONFIG, getNotionClient } from "@/config/notion";
import { getPropertyMultiValues, isFullPage } from "@/utils/notionOfficial";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const databaseId = NOTION_CONFIG.DEFAULT_DATABASE_ID;
    if (!databaseId) {
      return NextResponse.json(
        { error: "Database ID is required" },
        { status: 400 }
      );
    }

    const notion = getNotionClient();

    // 获取数据库中的所有角色
    const allRoles = await getAllRolesFromDatabase(notion, databaseId);

    // 验证密码是否匹配任何角色
    if (allRoles.includes(password)) {
      return NextResponse.json({
        success: true,
        role: password,
        message: "Authentication successful",
      });
    } else {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
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
