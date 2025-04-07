"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Eye, Share2, Trash } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

interface InterfacesListProps {
  interfaces: any
}

export function InterfacesList({ interfaces }: InterfacesListProps) {
  const [selectedInterface, setSelectedInterface] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const flattenedInterfaces = Object.entries(interfaces)
    .filter(([_, value]) => typeof value === 'object')
    .flatMap(([type, interfaces]: [string, any]) => 
      Object.entries(interfaces).map(([name, config]: [string, any]) => ({
        type,
        name,
        config
      }))
    )

  const handleEdit = (interfaceItem: any) => {
    setSelectedInterface(interfaceItem)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    // Would connect to API to save changes
    toast({
      title: "Interface updated",
      description: `${selectedInterface.type} ${selectedInterface.name} has been updated.`
    })
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      {flattenedInterfaces.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No interfaces configured
        </div>
      ) : (
        flattenedInterfaces.map((interfaceItem) => (
          <Card key={`${interfaceItem.type}-${interfaceItem.name}`} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{interfaceItem.name}</h3>
                  <Badge variant="outline">{interfaceItem.type}</Badge>
                  {interfaceItem.config.address && (
                    <Badge variant="secondary">
                      {Array.isArray(interfaceItem.config.address) 
                        ? interfaceItem.config.address[0] 
                        : interfaceItem.config.address}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => console.log("View", interfaceItem)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(interfaceItem)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => console.log("Delete", interfaceItem)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  {interfaceItem.config.description && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Description:</span>
                      <p className="text-sm">{interfaceItem.config.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <p className="text-sm font-medium">
                      {interfaceItem.config.disable ? "Disabled" : "Enabled"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">MTU:</span>
                    <p className="text-sm font-medium">
                      {interfaceItem.config.mtu || "Default"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit Interface Dialog */}
      {selectedInterface && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Interface: {selectedInterface.name}</DialogTitle>
              <DialogDescription>
                Update interface settings for {selectedInterface.type} {selectedInterface.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  defaultValue={selectedInterface.config.description || ""}
                  placeholder="Interface description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">IP Address</Label>
                  <Input
                    id="address"
                    defaultValue={
                      Array.isArray(selectedInterface.config.address)
                        ? selectedInterface.config.address[0]
                        : selectedInterface.config.address || ""
                    }
                    placeholder="IP Address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mtu">MTU</Label>
                  <Input
                    id="mtu"
                    type="number"
                    defaultValue={selectedInterface.config.mtu || ""}
                    placeholder="MTU"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 