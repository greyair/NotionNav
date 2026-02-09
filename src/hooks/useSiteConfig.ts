import { useEffect, useState } from "react";
import { ConfigCategory } from "@/types";

interface UseSiteConfigReturn {
  siteConfig: Record<string, string>;
  categories: ConfigCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSiteConfig(): UseSiteConfigReturn {
  const [siteConfig, setSiteConfig] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<ConfigCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/config");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSiteConfig(data.siteConfig || {});
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch config");
      console.error("Error fetching config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const refetch = () => {
    fetchConfig();
  };

  return {
    siteConfig,
    categories,
    loading,
    error,
    refetch,
  };
}
