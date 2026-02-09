/**
 * 环境变量管理工具
 * 统一处理环境变量的获取和验证
 */

/**
 * 获取链接 Notion 数据库 ID
 */
export function getNotionLinksDatabaseId(): string | undefined {
  return process.env.NOTION_LINKS_DATABASE_ID;
}

/**
 * 获取配置 Notion 数据库 ID
 */
export function getNotionConfigDatabaseId(): string | undefined {
  return process.env.NOTION_CONFIG_DATABASE_ID;
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

  const linksDatabaseId = getNotionLinksDatabaseId();
  const configDatabaseId = getNotionConfigDatabaseId();

  if (!linksDatabaseId) {
    errors.push("NOTION_LINKS_DATABASE_ID is required");
  }

  if (!configDatabaseId) {
    warnings.push("NOTION_CONFIG_DATABASE_ID is not set");
  }

  if (!process.env.NOTION_TOKEN) {
    errors.push("NOTION_TOKEN is required for the official Notion API");
  }

  // 检查环境变量格式
  if (linksDatabaseId && !/^[a-f0-9-]+$/i.test(linksDatabaseId)) {
    errors.push("NOTION_LINKS_DATABASE_ID format is invalid");
  }

  if (configDatabaseId && !/^[a-f0-9-]+$/i.test(configDatabaseId)) {
    errors.push("NOTION_CONFIG_DATABASE_ID format is invalid");
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
    notionLinksDatabaseId:
      process.env.NOTION_LINKS_DATABASE_ID || "not set",
    notionConfigDatabaseId:
      process.env.NOTION_CONFIG_DATABASE_ID || "not set",
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
