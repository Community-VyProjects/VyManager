'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Container {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  created_at: string;
  ports: any;
  mounts: string[];
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
  data: {
    ShowContainerContainer: {
      success: boolean;
      errors: string[] | null;
      data: {
        result: Container[];
      };
    };
  };
}

interface ImageResponse {
  data: {
    ShowImageContainer: {
      success: boolean;
      errors: string[] | null;
      data: {
        result: ContainerImage[];
      };
    };
  };
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<ContainerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch the API key
        const keyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/key`);
        if (!keyResponse.ok) {
          throw new Error('Failed to fetch API key');
        }
        const { key } = await keyResponse.json();

        // Fetch both containers and images in parallel
        const [containersResponse, imagesResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{ShowContainerContainer (data: {key: "${key}"}) {success errors data {result}}}`
            }),
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{ShowImageContainer (data: {key: "${key}"}) {success errors data {result}}}`
            }),
          })
        ]);

        if (!containersResponse.ok || !imagesResponse.ok) {
          throw new Error(`HTTP error! status: ${!containersResponse.ok ? containersResponse.status : imagesResponse.status}`);
        }

        const containersData = (await containersResponse.json()) as ContainerResponse;
        const imagesData = (await imagesResponse.json()) as ImageResponse;
        
        if (containersData.data?.ShowContainerContainer.success && imagesData.data?.ShowImageContainer.success) {
          setContainers(containersData.data.ShowContainerContainer.data.result);
          setImages(imagesData.data.ShowImageContainer.data.result);
        } else {
          setError(
            containersData.data?.ShowContainerContainer.errors?.[0] || 
            imagesData.data?.ShowImageContainer.errors?.[0] || 
            'Failed to fetch data'
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching data';
        setError(errorMessage);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

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
