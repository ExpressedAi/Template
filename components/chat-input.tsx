"use client";

import * as React from "react";
import { Mic, Send, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FilePreview } from "./file-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ChatInputProps {
  onSend: (content: string, file?: File) => void;
  attachedFile: File | null;
  onFileRemove: () => void;
}

export function ChatInput({
  onSend,
  attachedFile,
  onFileRemove,
}: ChatInputProps) {
  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const tools = [
    { id: 'firecrawl_scrape', name: 'Web Scraping', icon: Globe, description: 'Scrape single webpage content' },
    { id: 'firecrawl_crawl', name: 'Website Crawling', icon: Globe, description: 'Recursively crawl multiple pages' },
    { id: 'firecrawl_map', name: 'Website Mapping', icon: Globe, description: 'Fast discovery of all site URLs' },
  ];

  // Function to resize the textarea
  const resizeTextarea = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px"; // Reset height to calculate new scrollHeight
    el.style.height = Math.min(el.scrollHeight, 320) + "px"; // Cap height
  }, []);

  // Resize on content change
  React.useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  // Resize on initial mount to ensure correct sizing from the start
  // Using requestAnimationFrame to ensure the browser has completed its layout pass
  React.useLayoutEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      resizeTextarea();
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [resizeTextarea]);

  // Listen for custom event to insert text
  React.useEffect(() => {
    const handleInsertText = (event: CustomEvent<{ text: string }>) => {
      setContent(event.detail.text);
      textareaRef.current?.focus();
    };
    window.addEventListener("sylvia:insert-into-chat" as any, handleInsertText);
    return () => {
      window.removeEventListener("sylvia:insert-into-chat" as any, handleInsertText);
    };
  }, []);


  const canSend = (content.trim().length > 0) || !!attachedFile;

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!canSend || isSending) return;
    setIsSending(true);
    try {
      // Add tool hint to the content if a tool is selected
      let finalContent = content;
      if (selectedTool) {
        const tool = tools.find(t => t.id === selectedTool);
        if (tool) {
          finalContent = `[Use ${tool.name}] ${content}`;
        }
      }
      onSend(finalContent, attachedFile || undefined);
      setContent("");
      setSelectedTool(null); // Reset tool selection
      // do NOT clear attachedFile here – parent owns it via props
    } finally {
      // small delay to avoid rapid-double-submits feeling janky
      setTimeout(() => setIsSending(false), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter inserts newline. Enter sends.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }
    // Cmd/Ctrl + Enter also sends
    const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    if (cmdOrCtrl && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="relative mx-auto max-w-3xl">
        {attachedFile && (
          <FilePreview file={attachedFile} onRemove={onFileRemove} />
        )}

        {selectedTool && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-sm">
              <Globe className="h-3 w-3 mr-1" />
              Using {tools.find(t => t.id === selectedTool)?.name}
            </Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            rows={1}
            placeholder="How can Sylvia help?"
            className="min-h-[52px] max-h-[320px] resize-none rounded-2xl border-2 border-input bg-card p-4 pr-28 no-scrollbar"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message Sylvia"
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  type="button"
                  aria-label="Select REST API tool"
                  title="REST API Tools"
                >
                  <div className="relative">
                    <Globe className="h-5 w-5" />
                    {selectedTool && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedTool(null)}>
                  <div className="flex flex-col">
                    <span className="font-medium">No Tool</span>
                    <span className="text-xs text-muted-foreground">Regular conversation</span>
                  </div>
                </DropdownMenuItem>
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.id} onClick={() => setSelectedTool(tool.id)}>
                    <div className="flex items-start space-x-2">
                      <tool.icon className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">{tool.name}</span>
                        <span className="text-xs text-muted-foreground">{tool.description}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              type="button"
              aria-label="Voice (coming soon)"
              title="Voice input (coming soon)"
            >
              <Mic className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              className="rounded-full"
              type="submit"
              aria-label="Send message"
              title="Send (Enter)"
              disabled={!canSend || isSending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}