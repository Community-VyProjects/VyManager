"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, Check, Copy, Save } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ConfigEditorProps {
  config: any
}

export function ConfigEditor({ config }: ConfigEditorProps) {
  const [configText, setConfigText] = useState('')
  const [isValidJson, setIsValidJson] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setConfigText(JSON.stringify(config, null, 2))
  }, [config])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setConfigText(newText)
    
    try {
      JSON.parse(newText)
      setIsValidJson(true)
      setErrorMessage('')
    } catch (error) {
      setIsValidJson(false)
      setErrorMessage((error as Error).message)
    }
  }

  const handleSave = () => {
    if (!isValidJson) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "Please fix the errors before saving"
      })
      return
    }

    try {
      const parsedConfig = JSON.parse(configText)
      
      // Would connect to API to save changes
      toast({
        title: "Configuration saved",
        description: "Your changes have been applied"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving configuration",
        description: (error as Error).message
      })
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(configText)
    toast({
      title: "Copied to clipboard",
      description: "Configuration has been copied to your clipboard"
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Edit Configuration</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isValidJson}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
      
      {!isValidJson && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid JSON</AlertTitle>
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative">
        <textarea
          className={cn(
            "w-full min-h-[400px] p-4 font-mono text-sm rounded-md border bg-background",
            !isValidJson ? "border-destructive" : "border-input"
          )}
          value={configText}
          onChange={handleTextChange}
          spellCheck="false"
        />
        {isValidJson && (
          <div className="absolute top-2 right-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
} 