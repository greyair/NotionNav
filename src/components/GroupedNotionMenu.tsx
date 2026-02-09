import { ConfigCategory, NavMenuItem, ViewMode } from "@/types";
import { HeartIcon } from "./icons/HeartIcon";
import { Avatar } from "./Avatar";
import { useCallback, memo, useState, useEffect, useMemo } from "react";
import LiquidGlassWrapper from "./LiquidGlassWrapper";

interface GroupedNotionMenuProps {
  menuItems: NavMenuItem[];
  isLan: boolean;
  userRole: string;
  addFavorite: (item: NavMenuItem) => void;
  removeFavorite: (href: string) => void;
  isFavorite: (href: string) => boolean;
  categoryOrder?: string[];
  isLiquidGlass: boolean;
  viewMode: ViewMode;
  categories?: ConfigCategory[];
}

export const GroupedNotionMenu = memo(
  ({
    menuItems,
    isLan,
    userRole,
    addFavorite,
    removeFavorite,
    isFavorite,
    categoryOrder = [],
    isLiquidGlass,
    viewMode,
    categories = [],
  }: GroupedNotionMenuProps) => {
    // 添加客户端渲染控制
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleFavoriteClick = useCallback(
      (e: React.MouseEvent, item: NavMenuItem) => {
        e.preventDefault();
        e.stopPropagation();

        if (isFavorite(item.href)) {
          removeFavorite(item.href);
        } else {
          addFavorite(item);
        }
      },
      [addFavorite, removeFavorite, isFavorite]
    );

    // 过滤菜单项，只显示用户有权限访问的
    const filteredItems = menuItems.filter((item) =>
      item.roles?.includes(userRole)
    );

    const groupedItems = useMemo(() => {
      const groups: Record<string, NavMenuItem[]> = {};

      filteredItems.forEach((item) => {
        const category = item.category || "其他";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(item);
      });

      Object.keys(groups).forEach((category) => {
        groups[category].sort((a, b) => {
          const timeA = a.lastEditedTime || 0;
          const timeB = b.lastEditedTime || 0;
          return timeB - timeA;
        });
      });

      return groups;
    }, [filteredItems]);

    const sortedCategories = useMemo(() => {
      const allCategories = Object.keys(groupedItems);
      return [
        ...categoryOrder.filter((cat) => allCategories.includes(cat)),
        ...allCategories.filter((cat) => !categoryOrder.includes(cat)),
      ];
    }, [groupedItems, categoryOrder]);

    const categoryTree = useMemo(() => {
      const activeCategories = categories.filter(
        (category) => !category.status || category.status === "active"
      );
      const byId = new Map(activeCategories.map((cat) => [cat.id, cat]));
      const byName = new Map(
        activeCategories.map((cat) => [cat.name.toLowerCase(), cat])
      );

      const parents = activeCategories
        .filter((cat) => !cat.parentId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const childrenByParent = new Map<string, ConfigCategory[]>();

      for (const category of activeCategories) {
        if (!category.parentId) {
          continue;
        }

        if (!childrenByParent.has(category.parentId)) {
          childrenByParent.set(category.parentId, []);
        }

        childrenByParent.get(category.parentId)?.push(category);
      }

      for (const children of childrenByParent.values()) {
        children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }

      const categoryGroups = parents.map((parent) => {
        const children = childrenByParent.get(parent.id) || [];
        return {
          parent,
          children,
        };
      });

      return {
        categoryGroups,
        byName,
        byId,
      };
    }, [categories]);

    const groupedByConfig = useMemo(() => {
      if (categoryTree.categoryGroups.length === 0) {
        return null;
      }

      const itemsByParent = new Map<string, NavMenuItem[]>();
      const itemsByChild = new Map<string, Map<string, NavMenuItem[]>>();
      const unknownItems: NavMenuItem[] = [];

      for (const item of filteredItems) {
        const categoryKey = item.category?.toLowerCase();
        const subcategoryKey = item.subcategory?.toLowerCase();
        const categoryMatch = categoryKey
          ? categoryTree.byName.get(categoryKey)
          : undefined;

        let parentCategory = categoryMatch;
        let childCategory = undefined as ConfigCategory | undefined;

        if (categoryMatch?.parentId) {
          childCategory = categoryMatch;
          parentCategory = categoryTree.byId.get(categoryMatch.parentId);
        }

        if (!parentCategory) {
          unknownItems.push(item);
          continue;
        }

        if (subcategoryKey) {
          const subMatch = categoryTree.byName.get(subcategoryKey);
          if (subMatch?.parentId === parentCategory.id) {
            if (!itemsByChild.has(parentCategory.id)) {
              itemsByChild.set(parentCategory.id, new Map());
            }
            const childMap = itemsByChild.get(parentCategory.id);
            if (childMap && !childMap.has(subMatch.id)) {
              childMap.set(subMatch.id, []);
            }
            childMap?.get(subMatch.id)?.push(item);
            continue;
          }
        }

        if (childCategory) {
          if (!itemsByChild.has(parentCategory.id)) {
            itemsByChild.set(parentCategory.id, new Map());
          }
          const childMap = itemsByChild.get(parentCategory.id);
          if (childMap && !childMap.has(childCategory.id)) {
            childMap.set(childCategory.id, []);
          }
          childMap?.get(childCategory.id)?.push(item);
          continue;
        }

        if (!itemsByParent.has(parentCategory.id)) {
          itemsByParent.set(parentCategory.id, []);
        }
        itemsByParent.get(parentCategory.id)?.push(item);
      }

      const orderedParents = categoryTree.categoryGroups.map(({ parent, children }) => {
        const parentItems = itemsByParent.get(parent.id) || [];
        const orderedChildren = children.map((child) => ({
          category: child,
          items: itemsByChild.get(parent.id)?.get(child.id) || [],
        }));

        return {
          parent,
          items: parentItems,
          children: orderedChildren,
        };
      });

      return {
        parents: orderedParents,
        unknownItems,
      };
    }, [categoryTree, filteredItems]);

    const layout = useMemo(() => {
      if (viewMode === "list") {
        return {
          gridClass: "grid grid-cols-1 gap-3",
          itemClass: "p-4 space-x-4",
          avatarSize: 32,
          titleClass: "text-base",
          descClass: "text-sm",
        };
      }

      if (viewMode === "compact") {
        return {
          gridClass:
            "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3",
          itemClass: "p-3 space-x-4",
          avatarSize: 28,
          titleClass: "text-sm",
          descClass: "text-xs",
        };
      }

      return {
        gridClass:
          "grid md:grid-cols-2 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4",
        itemClass: "p-5 space-x-6",
        avatarSize: 36,
        titleClass: "text-base",
        descClass: "text-sm",
      };
    }, [viewMode]);

    // 服务端渲染时返回基础结构
    if (!mounted) {
      return <div className="mb-6" />;
    }

    if (filteredItems.length === 0) {
      return null;
    }

    return (
      <div className="mb-6">
        {groupedByConfig
          ? groupedByConfig.parents.map(({ parent, items, children }) => (
              <div key={parent.id} className="mb-8">
                <h2 className="font-semibold text-slate-800 text-base mb-4 text-white">
                  <i
                    className="iconfont icon-notion"
                    style={{ marginRight: "4px", marginTop: "-3px" }}
                  />
                  {parent.name}
                </h2>

                {items.length > 0 && (
                  <div className={layout.gridClass}>
                    {items.map((item, index) => (
                      <LiquidGlassWrapper
                        key={item.id || item.href}
                        isActive={isLiquidGlass}
                        className="relative rounded-2xl"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <HeartIcon
                          isFavorite={isFavorite(item.href)}
                          onClick={(e) => handleFavoriteClick(e, item)}
                          className={`absolute top-2 right-2 z-10 favorite-icon ${
                            isFavorite(item.href) ? "opacity-100" : ""
                          }`}
                        />
                        <a
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            backgroundColor: isLiquidGlass
                              ? "transparent"
                              : "rgba(42, 42, 42, 0.42)",
                          }}
                          className={`flex justify-items-start items-center rounded-2xl text-white cursor-pointer ${layout.itemClass}`}
                          onClick={
                            (e: React.MouseEvent<HTMLAnchorElement>) =>
                              window.handleLinkClick &&
                              window.handleLinkClick(
                                e,
                                isLan ? item.lanHref || item.href : item.href,
                                item.target
                              )
                          }
                        >
                          <Avatar
                            src={item.avatar}
                            alt={item.title}
                            href={item.href}
                            size={layout.avatarSize}
                            className="rounded-lg"
                          />
                          <div className="min-w-0 relative flex-auto">
                            <h3
                              className={`font-semibold text-slate-900 truncate pr-20 text-white ${layout.titleClass}`}
                            >
                              {item.title}
                            </h3>
                            <div
                              className={`font-normal truncate mt-1 text-white ${layout.descClass}`}
                            >
                              {item.description}
                            </div>
                          </div>
                        </a>
                      </LiquidGlassWrapper>
                    ))}
                  </div>
                )}

                {children.map((child) => (
                  <div key={child.category.id} className="mt-6">
                    <h3 className="text-sm font-semibold text-white/80 mb-3">
                      {child.category.name}
                    </h3>
                    <div className={layout.gridClass}>
                      {child.items.map((item, index) => (
                        <LiquidGlassWrapper
                          key={item.id || item.href}
                          isActive={isLiquidGlass}
                          className="relative rounded-2xl"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <HeartIcon
                            isFavorite={isFavorite(item.href)}
                            onClick={(e) => handleFavoriteClick(e, item)}
                            className={`absolute top-2 right-2 z-10 favorite-icon ${
                              isFavorite(item.href) ? "opacity-100" : ""
                            }`}
                          />
                          <a
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              backgroundColor: isLiquidGlass
                                ? "transparent"
                                : "rgba(42, 42, 42, 0.42)",
                            }}
                            className={`flex justify-items-start items-center rounded-2xl text-white cursor-pointer ${layout.itemClass}`}
                            onClick={
                              (e: React.MouseEvent<HTMLAnchorElement>) =>
                                window.handleLinkClick &&
                                window.handleLinkClick(
                                  e,
                                  isLan
                                    ? item.lanHref || item.href
                                    : item.href,
                                  item.target
                                )
                            }
                          >
                            <Avatar
                              src={item.avatar}
                              alt={item.title}
                              href={item.href}
                              size={layout.avatarSize}
                              className="rounded-lg"
                            />
                            <div className="min-w-0 relative flex-auto">
                              <h3
                                className={`font-semibold text-slate-900 truncate pr-20 text-white ${layout.titleClass}`}
                              >
                                {item.title}
                              </h3>
                              <div
                                className={`font-normal truncate mt-1 text-white ${layout.descClass}`}
                              >
                                {item.description}
                              </div>
                            </div>
                          </a>
                        </LiquidGlassWrapper>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          : sortedCategories.map((category) => (
              <div key={category} className="mb-8">
                <h2 className="font-semibold text-slate-800 text-base mb-4 text-white">
                  <i
                    className="iconfont icon-notion"
                    style={{ marginRight: "4px", marginTop: "-3px" }}
                  />
                  {category}
                </h2>

                <div className={layout.gridClass}>
                  {groupedItems[category].map((item, index) => (
                    <LiquidGlassWrapper
                      key={item.id || item.href}
                      isActive={isLiquidGlass}
                      className="relative rounded-2xl"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <HeartIcon
                        isFavorite={isFavorite(item.href)}
                        onClick={(e) => handleFavoriteClick(e, item)}
                        className={`absolute top-2 right-2 z-10 favorite-icon ${
                          isFavorite(item.href) ? "opacity-100" : ""
                        }`}
                      />
                      <a
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          backgroundColor: isLiquidGlass
                            ? "transparent"
                            : "rgba(42, 42, 42, 0.42)",
                        }}
                        className={`flex justify-items-start items-center rounded-2xl text-white cursor-pointer ${layout.itemClass}`}
                        onClick={
                          (e: React.MouseEvent<HTMLAnchorElement>) =>
                            window.handleLinkClick &&
                            window.handleLinkClick(
                              e,
                              isLan ? item.lanHref || item.href : item.href,
                              item.target
                            )
                        }
                      >
                        <Avatar
                          src={item.avatar}
                          alt={item.title}
                          href={item.href}
                          size={layout.avatarSize}
                          className="rounded-lg"
                        />
                        <div className="min-w-0 relative flex-auto">
                          <h3
                            className={`font-semibold text-slate-900 truncate pr-20 text-white ${layout.titleClass}`}
                          >
                            {item.title}
                          </h3>
                          <div
                            className={`font-normal truncate mt-1 text-white ${layout.descClass}`}
                          >
                            {item.description}
                          </div>
                        </div>
                      </a>
                    </LiquidGlassWrapper>
                  ))}
                </div>
              </div>
            ))}

        {groupedByConfig && groupedByConfig.unknownItems.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-slate-800 text-base mb-4 text-white">
              <i
                className="iconfont icon-notion"
                style={{ marginRight: "4px", marginTop: "-3px" }}
              />
              其他
            </h2>
            <div className={layout.gridClass}>
              {groupedByConfig.unknownItems.map((item, index) => (
                <LiquidGlassWrapper
                  key={item.id || item.href}
                  isActive={isLiquidGlass}
                  className="relative rounded-2xl"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <HeartIcon
                    isFavorite={isFavorite(item.href)}
                    onClick={(e) => handleFavoriteClick(e, item)}
                    className={`absolute top-2 right-2 z-10 favorite-icon ${
                      isFavorite(item.href) ? "opacity-100" : ""
                    }`}
                  />
                  <a
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: isLiquidGlass
                        ? "transparent"
                        : "rgba(42, 42, 42, 0.42)",
                    }}
                    className={`flex justify-items-start items-center rounded-2xl text-white cursor-pointer ${layout.itemClass}`}
                    onClick={
                      (e: React.MouseEvent<HTMLAnchorElement>) =>
                        window.handleLinkClick &&
                        window.handleLinkClick(
                          e,
                          isLan ? item.lanHref || item.href : item.href,
                          item.target
                        )
                    }
                  >
                    <Avatar
                      src={item.avatar}
                      alt={item.title}
                      href={item.href}
                      size={layout.avatarSize}
                      className="rounded-lg"
                    />
                    <div className="min-w-0 relative flex-auto">
                      <h3
                        className={`font-semibold text-slate-900 truncate pr-20 text-white ${layout.titleClass}`}
                      >
                        {item.title}
                      </h3>
                      <div
                        className={`font-normal truncate mt-1 text-white ${layout.descClass}`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </a>
                </LiquidGlassWrapper>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

GroupedNotionMenu.displayName = "GroupedNotionMenu";
