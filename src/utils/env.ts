/**
 * 环境变量管理工具
 * 统一处理环境变量的获取和验证
 */

/**
 * 获取 Notion 数据库 ID
 * 优先级：环境变量 > 兼容旧变量
 */
export function getNotionDatabaseId(): string | undefined {
  return process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
}

/**
 * 兼容旧的 Notion 页面 ID 读取
 */
export function getNotionPageId(): string {
  return getNotionDatabaseId() || "";
}

/**
 * 获取 Notion Token（可选）
 */
export function getNotionToken(): string | undefined {
  return process.env.NOTION_TOKEN;
}

/**
 * 获取 Notion Active User（可选）
 */
export function getNotionActiveUser(): string | undefined {
  return process.env.NOTION_ACTIVE_USER;
}

/**
 * 验证环境变量配置
 */
export function validateEnvironment(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseId = getNotionDatabaseId();

  if (!databaseId) {
    errors.push("NOTION_DATABASE_ID (or NOTION_PAGE_ID) is required");
  }

  if (!process.env.NOTION_TOKEN) {
    errors.push("NOTION_TOKEN is required for the official Notion API");
  }

  // 检查环境变量格式
  if (databaseId && !/^[a-f0-9-]+$/i.test(databaseId)) {
    errors.push("NOTION_DATABASE_ID format is invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 获取环境信息（用于调试）
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    notionDatabaseId: process.env.NOTION_DATABASE_ID || "not set",
    notionPageId: process.env.NOTION_PAGE_ID || "not set",
    notionToken: process.env.NOTION_TOKEN ? "set" : "not set",
    notionActiveUser: process.env.NOTION_ACTIVE_USER ? "set" : "not set",
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
  };
}

/**
 * 获取 Notion API Base URL
 * 优先级：环境变量 > 默认值
 */
export function getNotionApiBaseUrl(): string {
  const envApiBaseUrl = process.env.NOTION_API_BASE_URL;

  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  const defaultApiBaseUrl = "https://www.notion.so/api/v3";
  return defaultApiBaseUrl;
}
