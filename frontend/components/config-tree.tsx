"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface ConfigTreeProps {
  data: any
  path: string[]
}

export function ConfigTree({ data, path }: ConfigTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  const toggleNode = (nodePath: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodePath]: !prev[nodePath]
    }))
  }

  const renderLeaf = (key: string, value: any, currentPath: string[]) => {
    const fullPath = [...currentPath, key].join('.')
    
    if (value === null || value === undefined) {
      return (
        <div key={key} className="flex items-center pl-4 py-1">
          <FileText className="h-4 w-4 text-muted-foreground mr-2" />
          <div className="flex items-center justify-between w-full">
            <span className="text-sm">{key}</span>
            <span className="text-xs text-muted-foreground">empty</span>
          </div>
        </div>
      )
    }

    if (typeof value !== 'object') {
      return (
        <div key={key} className="flex items-center pl-4 py-1">
          <FileText className="h-4 w-4 text-muted-foreground mr-2" />
          <div className="flex items-center justify-between w-full">
            <span className="text-sm">{key}</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">{String(value)}</span>
          </div>
        </div>
      )
    }

    const isExpanded = expandedNodes[fullPath] || false
    const isEmpty = Object.keys(value).length === 0

    return (
      <div key={key} className="py-1">
        <div 
          className="flex items-center hover:bg-muted/50 rounded cursor-pointer pl-4"
          onClick={() => !isEmpty && toggleNode(fullPath)}
        >
          {isEmpty ? (
            <FileText className="h-4 w-4 text-muted-foreground mr-2" />
          ) : (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground mr-2" />
            )
          )}
          <div className="flex items-center justify-between w-full py-1">
            <span className="text-sm font-medium">{key}</span>
            <Badge variant="outline" className="text-xs">
              {Array.isArray(value) ? "array" : "object"}
              {!isEmpty && ` (${Object.keys(value).length})`}
            </Badge>
          </div>
        </div>
        
        {isExpanded && !isEmpty && (
          <div className="ml-4 border-l pl-3 mt-1">
            {Object.entries(value).map(([childKey, childValue]) => 
              renderLeaf(childKey, childValue, [...currentPath, key])
            )}
          </div>
        )}
      </div>
    )
  }

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast({
      title: "Copied to clipboard",
      description: "Configuration has been copied to your clipboard"
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Configuration: {path.join(' > ')}</h3>
        <Button variant="outline" size="sm" onClick={copyConfig}>
          Copy JSON
        </Button>
      </div>
      
      <div className="border rounded-md p-2 bg-background overflow-auto max-h-[600px]">
        {Object.entries(data).map(([key, value]) => 
          renderLeaf(key, value, path)
        )}
      </div>
    </div>
  )
} 