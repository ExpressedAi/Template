"use client";

import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sidebar } from "@/components/sidebar";
import { ChatHeader } from "@/components/chat-header";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ArtifactsPanel } from "@/components/artifacts-panel";
import { AuxiliaryAgent } from "@/components/auxiliary-agent";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { neuralHighway, generateSessionId, createNeuralContext } from "@/lib/neural-highway";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });

export function ChatLayout() {
  const { config } = useAgentConfig();
  const [isArtifactsOpen, setIsArtifactsOpen] = React.useState(false);
  const [isAuxiliaryOpen, setIsAuxiliaryOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [sessionId] = React.useState(() => generateSessionId()); // Neural Highway session
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for agent settings insert events
  React.useEffect(() => {
    const handleInsertIntoChat = (event: CustomEvent<{ text: string }>) => {
      handleSend(event.detail.text);
    };

    const handleToggleAuxiliary = () => {
      setIsAuxiliaryOpen(prev => !prev);
    };

    window.addEventListener('sylvia:insert-into-chat', handleInsertIntoChat as EventListener);
    window.addEventListener('sylvia:toggle-auxiliary', handleToggleAuxiliary as EventListener);
    
    return () => {
      window.removeEventListener('sylvia:insert-into-chat', handleInsertIntoChat as EventListener);
      window.removeEventListener('sylvia:toggle-auxiliary', handleToggleAuxiliary as EventListener);
    };
  }, []);

  const onToggleArtifacts = () => setIsArtifactsOpen((prev) => !prev);
  const onCloseArtifacts = () => setIsArtifactsOpen(false);
  const onToggleAuxiliary = () => setIsAuxiliaryOpen((prev) => !prev);
  const onCloseAuxiliary = () => setIsAuxiliaryOpen(false);

  // Generate context for auxiliary agent from recent messages
  const getMainAgentContext = () => {
    const recentMessages = messages.slice(-50); // Last 50 messages - much more context
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`) // No truncation - full message content
      .join('\n'); // No artificial size limit
  };

  const handleSend = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    const userMessageContent =
      content + (file ? `\n\n[Attached file: ${file.name}]` : "");
    const userMessage: Message = { id: uuidv4(), role: "user", content: userMessageContent };
    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      state: "thinking",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setAttachedFile(null);

    // 🧠 Broadcast user message to Neural Highway
    await neuralHighway.broadcastContextPulse(
      createNeuralContext('sylvia', 'conversation', {
        role: 'user',
        content: userMessageContent,
        timestamp: Date.now()
      }, sessionId, 'background')
    );

    try {
      const fileData = file
        ? {
            mimeType: file.type,
            data: await fileToBase64(file),
          }
        : undefined;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: content, 
          file: fileData,
          messages: messages, // Send full conversation history
          agentConfig: config, // Send agent configuration
          sessionId: sessionId // 🧠 Send session ID for Neural Highway access
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: "Sorry, something went wrong.", state: "error" }
            : msg
        )
      );
    } finally {
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === assistantMessage.id ? { ...msg, state: "done" } : msg
        );
        
        // 🧠 Broadcast assistant response to Neural Highway
        const finalAssistantMessage = updatedMessages.find(msg => msg.id === assistantMessage.id);
        if (finalAssistantMessage?.content) {
          neuralHighway.broadcastContextPulse(
            createNeuralContext('sylvia', 'conversation', {
              role: 'assistant',
              content: finalAssistantMessage.content,
              timestamp: Date.now()
            }, sessionId, 'background')
          );
        }
        
        return updatedMessages;
      });
    }
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    handleDragEvents(e);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type.startsWith("image/") ||
        droppedFile.type.startsWith("video/") ||
        droppedFile.type.startsWith("audio/") ||
        droppedFile.type === "application/pdf"
      ) {
        setAttachedFile(droppedFile);
      } else {
        console.warn("Unsupported file type:", droppedFile.type);
      }
    }
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full items-stretch"
    >
      <ResizablePanel
        defaultSize={5}
        minSize={4}
        maxSize={10}
        className="hidden min-w-[70px] md:block"
      >
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle withHandle className="hidden md:flex" />
      <ResizablePanel>
        <div
          className="relative flex h-full flex-col"
          onDrop={handleDrop}
          onDragOver={handleDragEvents}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
              <p className="font-semibold text-primary">Drop file here</p>
            </div>
          )}
          <ChatHeader onToggleArtifacts={onToggleArtifacts} onToggleAuxiliary={onToggleAuxiliary} />
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <ChatMessages messages={messages} />
          </div>
          {/* FIX: Input is now in a shrink-0 wrapper so it never jumps */}
          <div className="shrink-0">
            <ChatInput
              onSend={handleSend}
              attachedFile={attachedFile}
              onFileRemove={() => setAttachedFile(null)}
            />
          </div>
        </div>
      </ResizablePanel>
      {isArtifactsOpen && <ResizableHandle withHandle className="hidden md:flex" />}
      {isArtifactsOpen && (
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="hidden md:block"
        >
          <ArtifactsPanel onClose={onCloseArtifacts} />
        </ResizablePanel>
      )}
      {isAuxiliaryOpen && <ResizableHandle withHandle className="hidden md:flex" />}
      {isAuxiliaryOpen && (
        <ResizablePanel
          defaultSize={35}
          minSize={25}
          maxSize={60}
          className="hidden md:block"
        >
          <AuxiliaryAgent
            mainAgentContext={getMainAgentContext()}
            onClose={onCloseAuxiliary}
            isVisible={isAuxiliaryOpen}
            sessionId={sessionId}
          />
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
