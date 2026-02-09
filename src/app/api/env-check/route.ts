import { NextRequest, NextResponse } from "next/server";
import {
  validateEnvironment,
  getEnvironmentInfo,
  getNotionToken,
  getNotionDatabaseId,
} from "@/utils/env";

export async function GET(request: NextRequest) {
  try {
    const validation = validateEnvironment();
    const envInfo = getEnvironmentInfo();
    const currentDatabaseId = getNotionDatabaseId();
    const notionToken = getNotionToken();

    return NextResponse.json({
      success: true,
      validation,
      environment: envInfo,
      currentDatabaseId,
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
