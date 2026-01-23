"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCode2,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Globe,
  Lock,
  AlertTriangle,
} from "lucide-react";
import {
  templatesService,
  type ConfigTemplate,
  type TemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/lib/api/templates";
import { Skeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/useToast";
import { formatDistanceToNow } from "date-fns";
import { TemplateModal } from "@/components/templates/TemplateModal";

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  FIREWALL: "bg-orange-500/10 text-orange-500",
  NAT: "bg-yellow-500/10 text-yellow-500",
  ROUTING: "bg-cyan-500/10 text-cyan-500",
  VPN: "bg-indigo-500/10 text-indigo-500",
  INTERFACE: "bg-green-500/10 text-green-500",
  SERVICE: "bg-blue-500/10 text-blue-500",
  OTHER: "bg-gray-500/10 text-gray-500",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [myOnly, setMyOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConfigTemplate | null>(null);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await templatesService.listTemplates({
        category: categoryFilter !== "__all__" ? (categoryFilter as TemplateCategory) : undefined,
        my_only: myOnly,
      });
      setTemplates(result.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter, myOnly]);

  const handleDelete = async (template: ConfigTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      await templatesService.deleteTemplate(template.id);
      toast.success("Deleted", `Template "${template.name}" deleted`);
      loadTemplates();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setModalOpen(true);
  };

  const handleEdit = (template: ConfigTemplate) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  const handleDuplicate = async (template: ConfigTemplate) => {
    try {
      await templatesService.createTemplate({
        name: `${template.name} (Copy)`,
        description: template.description || undefined,
        category: template.category,
        config: template.config,
        variables: template.variables || undefined,
        isPublic: false, // Duplicates are private by default
      });
      toast.success("Duplicated", `Template "${template.name}" duplicated`);
      loadTemplates();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to duplicate");
    }
  };

  const handleModalSuccess = () => {
    toast.success("Success", selectedTemplate ? "Template updated" : "Template created");
    loadTemplates();
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading && templates.length === 0) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-72 mt-1" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileCode2 className="h-8 w-8" />
              Configuration Templates
            </h1>
            <p className="text-muted-foreground mt-1">
              Reusable configuration snippets for quick deployment
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {Object.entries(TEMPLATE_CATEGORIES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={myOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setMyOnly(!myOnly)}
              >
                {myOnly ? "My Templates" : "All Templates"}
              </Button>

              <Button variant="outline" size="sm" onClick={loadTemplates}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {error ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={loadTemplates} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FileCode2 className="h-8 w-8 mb-2 opacity-50" />
                <p>No templates found</p>
                <p className="text-sm mt-1">
                  Create your first template to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {template.description}
                            </p>
                          )}
                          {template.variables && template.variables.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.variables.length} variable(s)
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={CATEGORY_COLORS[template.category]}>
                          {TEMPLATE_CATEGORIES[template.category].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.isPublic ? (
                          <Badge variant="outline" className="gap-1">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {template.createdByName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(template.updatedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(template)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredTemplates.length} template(s)
        </div>
      </div>

      {/* Template Modal */}
      <TemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        template={selectedTemplate}
        onSuccess={handleModalSuccess}
      />
    </AppLayout>
  );
}
