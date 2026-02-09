import { NextRequest, NextResponse } from "next/server";
import {
  validateEnvironment,
  getEnvironmentInfo,
  getNotionToken,
  getNotionConfigDatabaseId,
  getNotionLinksDatabaseId,
} from "@/utils/env";

export async function GET(request: NextRequest) {
  try {
    const validation = validateEnvironment();
    const envInfo = getEnvironmentInfo();
    const currentLinksDatabaseId = getNotionLinksDatabaseId();
    const currentConfigDatabaseId = getNotionConfigDatabaseId();
    const notionToken = getNotionToken();

    return NextResponse.json({
      success: true,
      validation,
      environment: envInfo,
      currentLinksDatabaseId,
      currentConfigDatabaseId,
      notionConfig: {
        token: notionToken ? "set" : "not set",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking environment:", error);
    return NextResponse.json(
      { error: "Failed to check environment" },
      { status: 500 }
    );
  }
}
