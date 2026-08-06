"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getUnifiedViewConfig, type UnifiedViewSection } from "@/lib/unified-view/registry";

interface UnifiedViewProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  data: unknown;
}

export function UnifiedView({ isOpen, onClose, type, data }: UnifiedViewProps) {
  const router = useRouter();
  const [fetchedData, setFetchedData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);

  const config = getUnifiedViewConfig(type);

  // Fetch additional data when dialog opens
  useEffect(() => {
    if (isOpen && config?.dataFetcher) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const result = await config.dataFetcher!(data);
          setFetchedData(result);
        } catch (error) {
          console.error("Failed to fetch data:", error);
          setFetchedData(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setFetchedData(null);
    }
  }, [isOpen, type, config]);

  if (!config) {
    return null;
  }

  const Icon = config.icon;

  // Merge original data with fetched data
  const mergedData = fetchedData ? { ...(data as Record<string, unknown>), ...(fetchedData as Record<string, unknown>) } : data;

  const renderField = (label: string, value: string | number | boolean | undefined, format?: string) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (format === "badge") {
      return (
        <div>
          <label className="text-sm font-medium">{label}</label>
          <div className="mt-1">
            <Badge variant="secondary">{String(value)}</Badge>
          </div>
        </div>
      );
    }

    if (format === "badge-array") {
      const values = String(value).split(", ").filter(Boolean);
      return (
        <div>
          <label className="text-sm font-medium">{label}</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {values.map((v, i) => (
              <Badge key={i} variant="secondary">{v}</Badge>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{String(value)}</p>
      </div>
    );
  };

  const renderSection = (section: UnifiedViewSection, sectionData: unknown) => {
    const SectionIcon = section.icon;

    if (section.type === "custom" && section.component) {
      const CustomComponent = section.component;
      return <CustomComponent data={sectionData} />;
    }

    if (section.type === "info") {
      const fields = typeof section.fields === "function" ? section.fields(sectionData) : section.fields || [];
      const title = typeof section.title === "function" ? section.title(sectionData) : section.title;
      const description = typeof section.description === "function" ? section.description(sectionData) : section.description;
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {SectionIcon && <SectionIcon className="h-5 w-5" />}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {section.emptyIcon && <section.emptyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />}
                <p>{section.emptyMessage || "No information available"}</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {fields.map((field, idx) => (
                    <div key={idx}>{renderField(field.label, field.value, field.format)}</div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      );
    }

    if (section.type === "list") {
      const items = typeof section.items === "function" ? section.items(sectionData) : section.items || [];
      const title = typeof section.title === "function" ? section.title(sectionData) : section.title;
      const description = typeof section.description === "function" ? section.description(sectionData) : section.description;
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {SectionIcon && <SectionIcon className="h-5 w-5" />}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {section.emptyIcon && <section.emptyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />}
                <p>{section.emptyMessage || "No items to display"}</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                        )}
                      </div>
                      {item.badge && (
                        <Badge
                          variant={
                            typeof item.badge === "string"
                              ? "secondary"
                              : item.badge.variant || "secondary"
                          }
                        >
                          {typeof item.badge === "string" ? item.badge : item.badge.text}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderTabs = () => {
    const headerSections = config.headerSections || [];
    const mainSections = config.sections || [];

    if (!config.tabs && mainSections.length > 0) {
      // Single view without tabs
      return (
        <div className="space-y-4">
          {headerSections.map((section, idx) => (
            <div key={`header-${idx}`}>{renderSection(section, mergedData)}</div>
          ))}
          {mainSections.map((section, idx) => (
            <div key={`main-${idx}`}>{renderSection(section, mergedData)}</div>
          ))}
        </div>
      );
    }

    if (config.tabs) {
      const defaultTab = config.tabs[0]?.id;
      return (
        <div className="space-y-6">
          {headerSections.map((section, idx) => (
            <div key={`header-${idx}`}>{renderSection(section, mergedData)}</div>
          ))}
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${config.tabs.length}, 1fr)` }}>
              {config.tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {TabIcon && <TabIcon className="h-4 w-4 mr-2" />}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {config.tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                {tab.sections.map((section, idx) => (
                  <div key={idx}>{renderSection(section, mergedData)}</div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {config.title}
          </DialogTitle>
        </DialogHeader>
        <div className="pr-1">{renderTabs()}</div>
      </DialogContent>
    </Dialog>
  );
}