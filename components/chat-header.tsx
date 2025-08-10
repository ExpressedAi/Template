'use client';

import { useEffect } from 'react';
import { PanelRightOpen, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatHeaderProps {
  onToggleArtifacts: () => void;
  onToggleAuxiliary?: () => void;
}

export function ChatHeader({ onToggleArtifacts, onToggleAuxiliary }: ChatHeaderProps) {
  // Keyboard shortcuts: Cmd/Ctrl + Shift + A (artifacts), Cmd/Ctrl + Shift + X (auxiliary)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        onToggleArtifacts();
      }
      if (cmdOrCtrl && e.shiftKey && (e.key === 'X' || e.key === 'x') && onToggleAuxiliary) {
        e.preventDefault();
        onToggleAuxiliary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleArtifacts, onToggleAuxiliary]);

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Sylvia</h2>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          // your agentic workspace
        </span>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-1">
          {onToggleAuxiliary && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleAuxiliary}
                  aria-label="Toggle Auxiliary Agent"
                  className="h-8 w-8"
                >
                  <Bot className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <p className="text-xs">
                  Toggle Auxiliary Agent
                  <span className="ml-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    ⌘/Ctrl + ⇧ + X
                  </span>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleArtifacts}
                aria-label="Toggle Artifacts panel"
                className="h-8 w-8"
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <p className="text-xs">
                Toggle Artifacts
                <span className="ml-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘/Ctrl + ⇧ + A
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
