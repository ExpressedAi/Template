import {
  Bot,
  Search,
  Edit,
  Mic,
  MessageSquare,
  CheckSquare,
  Box,
  Puzzle,
  History,
  X,
  LucideIcon,
  Settings, // Import the Settings icon
  FileText, // Import the FileText icon for Article Designer
  Split, // Import the Split icon for SBS Prompting
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link"; // Import Link for navigation

export function Sidebar() {
  return (
    <div className="flex h-full flex-col items-center bg-sidebar p-2 text-sidebar-foreground">
      <TooltipProvider delayDuration={0}>
        {/* Top section */}
        <div className="flex flex-1 flex-col items-center space-y-2">
          <div className="flex justify-center py-2">
            <Bot size={28} />
          </div>

          <SidebarButton icon={Search} label="Search" />
          <SidebarButton icon={Edit} label="New Chat" />
          <SidebarButton icon={Mic} label="Voice" />
          <SidebarButton icon={MessageSquare} label="Prompts" />
          <SidebarButton icon={CheckSquare} label="Tasks" />
          <SidebarButton icon={Box} label="Plugins" />
          <SidebarButton icon={Puzzle} label="Extensions" href="/extensions" />
          <SidebarButton icon={FileText} label="Article Designer" href="/articles" />
          <SidebarButton icon={Split} label="SBS Prompting" href="/sbs" />
          <SidebarButton icon={History} label="History" />
          {/* New button for Agent Settings */}
          <SidebarButton icon={Settings} label="Agent Settings" href="/agent" />
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col items-center space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarFallback>J</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">User</TooltipContent>
          </Tooltip>

        </div>
      </TooltipProvider>
    </div>
  );
}

/* Reusable sidebar button */
function SidebarButton({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href?: string }) {
  const content = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}