import ReactMarkdown from "react-markdown";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { Card } from "@/components/ui/card";
import type { Message as MessageType } from "@/lib/types";
import { AttachmentAdmonition } from "./attachment-admonition";

const attachmentRegex = /\[Attached file:\s*([^\]]+)\]/i;

export function Message({ role, content, state }: MessageType) {
  return role === "user" ? (
    <UserMessage content={content} />
  ) : (
    <AssistantMessage content={content} state={state} />
  );
}

/* ---------- User message ---------- */
function UserMessage({ content }: { content: string }) {
  const match = content.match(attachmentRegex);
  const mainContent = match ? content.replace(attachmentRegex, "").trim() : content.trim();
  const fileName = match?.[1];

  return (
    <div className="flex justify-end">
      <Card className="max-w-xl rounded-2xl bg-card p-4 text-card-foreground">
        {mainContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-2">
            <ReactMarkdown>{mainContent}</ReactMarkdown>
          </div>
        )}
        {fileName && <AttachmentAdmonition fileName={fileName} />}
      </Card>
    </div>
  );
}

/* ---------- Assistant message ---------- */
function AssistantMessage({
  content,
  state,
}: {
  content: string;
  state?: MessageType["state"];
}) {
  return (
    <div className="flex justify-start">
      <Card className="w-full max-w-2xl rounded-2xl bg-muted p-4">
        {state === "thinking" && <ThinkingIndicator />}
        {content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  );
}
