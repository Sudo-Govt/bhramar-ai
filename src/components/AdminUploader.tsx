// FILE: src/components/AdminUploader.tsx
// Bhramar.ai — Super admin document uploader (PDF/DOCX/URL)

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Link, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "reading" | "uploading" | "processing" | "completed" | "failed";

interface UploadResult {
  document_id: string;
  title: string;
  chunks_total: number;
  chunks_inserted: number;
  status: string;
}

export function AdminUploader() {
  const { user } = useAuth();
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("custom");
  const [actName, setActName] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  // Check if current user is super admin
  const isSuperAdmin = user?.email === "bhramar123@gmail.com";

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!isSuperAdmin) {
      setError("Super admin access required");
      return;
    }

    try {
      let payload: any = {
        source,
        title: title || (source === "url" ? url : file?.name),
        description: description || null,
        document_type: documentType,
        act_name: actName || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      if (source === "upload") {
        if (!file) {
          setError("Please select a file");
          return;
        }
        setStatus("reading");
        const base64 = await fileToBase64(file);
        payload.filename = file.name;
        payload.content_base64 = base64;
      } else {
        if (!url) {
          setError("Please enter a URL");
          return;
        }
        payload.url = url;
      }

      setStatus("uploading");
      setProgress(30);

      const { data: sessionData } = await fetch("/supabase/functions/v1/ingest-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await import("@/integrations/supabase/client")).supabase.auth.getSession().then(r => r.data.session?.access_token)}`,
        },
        body: JSON.stringify(payload),
      }).then(r => r.json());

      setProgress(70);
      setStatus("processing");

      // Poll for completion (simplified — in production use realtime)
      await new Promise(r => setTimeout(r, 2000));

      setProgress(100);
      setStatus("completed");
      setResult(sessionData);

    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Super admin access required to upload training documents.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Admin Document Uploader
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={source === "upload" ? "default" : "outline"}
              onClick={() => setSource("upload")}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <Button
              type="button"
              variant={source === "url" ? "default" : "outline"}
              onClick={() => setSource("url")}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              From URL
            </Button>
          </div>

          {/* File or URL Input */}
          {source === "upload" ? (
            <div className="space-y-2">
              <Label>File (PDF, DOCX, TXT, MD)</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                disabled={status === "uploading" || status === "processing"}
              />
              {file && (
                <Badge variant="secondary">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </Badge>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                type="url"
                placeholder="https://example.com/legal-document.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === "uploading" || status === "processing"}
              />
            </div>
          )}

          {/* Document Details */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bharatiya Nyaya Sanhita 2023 - Complete Act"
              disabled={status === "uploading" || status === "processing"}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document..."
              disabled={status === "uploading" || status === "processing"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="act">Act / Law</SelectItem>
                  <SelectItem value="article">Article / Blog</SelectItem>
                  <SelectItem value="ebook">eBook / Guide</SelectItem>
                  <SelectItem value="judgment">Court Judgment</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Act Name (if applicable)</Label>
              <Input
                value={actName}
                onChange={(e) => setActName(e.target.value)}
                placeholder="Bharatiya Nyaya Sanhita 2023"
                disabled={status === "uploading" || status === "processing"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="criminal, bns, bail, procedure"
              disabled={status === "uploading" || status === "processing"}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={status === "uploading" || status === "processing"}
          >
            {status === "uploading" || status === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === "uploading" ? "Uploading..." : "Processing..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Ingest Document
              </>
            )}
          </Button>

          {/* Progress */}
          {(status === "uploading" || status === "processing") && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {status === "uploading" ? "Uploading file..." : "Generating embeddings..."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <div>
                <p className="font-medium">{result.title}</p>
                <p className="text-xs">
                  {result.chunks_inserted} of {result.chunks_total} chunks ingested successfully
                </p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
