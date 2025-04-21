'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { executeSavingMethod } from "../utils"

interface Container {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  created_at: string;
  ports: any;
  mounts: string[];
  command: string[] | null;
  cid_file: string;
  exited: boolean;
  exit_code: number;
  image_id: string;
  is_infra: boolean;
  labels: Record<string, string> | null;
  namespaces: Record<string, any>;
  networks: any[];
  pid: number;
  pod: string;
  pod_name: string;
  restarts: number;
  size: any;
  started_at: number;
  created: number;
}

interface ContainerImage {
  id: string;
  parent_id: string;
  repo_tags: string[] | null;
  repo_digests: string[];
  size: number;
  shared_size: number;
  virtual_size: number;
  labels: Record<string, string> | null;
  containers: number;
  names: string[];
  digest: string;
  history: string[];
  created: number;
  created_at: string;
  dangling?: boolean;
}

interface ContainerResponse {
  success: boolean;
  error: string | null;
  data: {
    containers: Container[];
    images: ContainerImage[];
  };
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<ContainerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    executeSavingMethod();
    setIsRefreshing(true);
    try {
      // Make parallel requests for containers and images
      const [containersResponse, imagesResponse] = await Promise.all([
        fetch(`${apiUrl}/api/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: 'ShowContainerContainer'
          })
        }),
        fetch(`${apiUrl}/api/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operationName: 'ShowImageContainer'
          })
        })
      ]);
      
      if (!containersResponse.ok || !imagesResponse.ok) {
        const errorResponse = !containersResponse.ok ? containersResponse : imagesResponse;
        const errorData = await errorResponse.json().catch(() => ({
          error: `Server error: ${errorResponse.status} ${errorResponse.statusText}`
        }));
        
        console.error("Error response:", errorData);
        
        toast({
          variant: "destructive",
          title: "Error connecting to VyOS router",
          description: errorData.error || `Server returned ${errorResponse.status} ${errorResponse.statusText}`
        });
        
        setError("Connection error");
        return;
      }
      
      const [containersData, imagesData] = await Promise.all([
        containersResponse.json(),
        imagesResponse.json()
      ]);
      
      // Extract the nested data from the GraphQL response
      const containersList = containersData?.data?.ShowContainerContainer?.data?.result || [];
      const imagesList = imagesData?.data?.ShowImageContainer?.data?.result || [];
      
      // Check if we have valid data from both endpoints
      const containersSuccess = containersData?.data?.ShowContainerContainer?.success;
      const imagesSuccess = imagesData?.data?.ShowImageContainer?.success;
      
      if (containersSuccess && imagesSuccess) {
        setContainers(containersList);
        setImages(imagesList);
        setError(null);
        
        toast({
          title: "Containers loaded",
          description: `Successfully loaded ${containersList.length} containers and ${imagesList.length} images`
        });
      } else {
        const containerError = containersData?.data?.ShowContainerContainer?.errors;
        const imageError = imagesData?.data?.ShowImageContainer?.errors;
        console.error("Failed to load containers/images:", { containerError, imageError });
        toast({
          variant: "destructive",
          title: "Error loading containers",
          description: containerError || imageError || "Could not load container information"
        });
        setError("Failed to load data");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Could not connect to the API server. Please check that the backend is running."
      });
      setError("Connection error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format size to human readable format
  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500 text-center">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Containers</h1>
          <p className="text-slate-400">View containers and images</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Containers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Mounts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell>
                    {container.names.join(', ')}
                  </TableCell>
                  <TableCell>{container.image}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(container.state)}>
                      {container.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {container.created_at}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {container.mounts.join(', ')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Containers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.map((image) => (
                <TableRow key={image.id}>
                  <TableCell>
                    {image.names?.[0] || image.digest.substring(7, 19)}
                  </TableCell>
                  <TableCell>{formatSize(image.size)}</TableCell>
                  <TableCell>{image.created_at}</TableCell>
                  <TableCell>{image.containers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 
