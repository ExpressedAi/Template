"use client";

import * as React from "react";
import { Upload, Download, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AgentMainPrompt } from "@/components/agent-main-prompt";
import { AgentCommands } from "@/components/agent-commands";
import { AgentCartridges } from "@/components/agent-cartridges";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { downloadJSON, importAgentConfig } from "@/lib/agent-utils";

export default function AgentPage() {
  const { config, save, replaceAll, loading } = useAgentConfig();
  const router = useRouter();

  const [mainPrompt, setMainPrompt] = React.useState(config.mainPrompt);
  React.useEffect(() => setMainPrompt(config.mainPrompt), [config.mainPrompt]);

  const handleSaveMainPrompt = () => save({ mainPrompt });

  const handleCommandsChange = (commands: typeof config.commands) => {
    save({ commands });
  };

  const handleCartridgesChange = (cartridges: typeof config.cartridges) => {
    save({ cartridges });
  };

  const handleExport = () => downloadJSON("sylvia-agent-config.json", config);
  
  const handleImport = (file: File) => {
    importAgentConfig(file, replaceAll, (message) => alert(message));
  };

  const sendToChat = (text: string) => {
    window.dispatchEvent(new CustomEvent("sylvia:insert-into-chat", { detail: { text } }));
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Sylvia — Main Agent</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </label>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <AgentMainPrompt
        prompt={mainPrompt}
        onPromptChange={setMainPrompt}
        onSave={handleSaveMainPrompt}
        loading={loading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentCommands
          commands={config.commands}
          cartridges={config.cartridges}
          onCommandsChange={handleCommandsChange}
          onSendToChat={sendToChat}
          loading={loading}
        />

        <AgentCartridges
          cartridges={config.cartridges}
          commands={config.commands}
          onCartridgesChange={handleCartridgesChange}
          onCommandsChange={handleCommandsChange}
          onSendToChat={sendToChat}
          loading={loading}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {loading ? "Loading from IndexedDB…" : `Updated: ${new Date(config.updatedAt).toLocaleString()}`}
      </div>
    </div>
  );
}