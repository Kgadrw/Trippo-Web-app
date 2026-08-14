import { useEffect, useState } from "react";
import { BarChart3, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatPollInput } from "@/lib/workspaceChatRealtime";

type ChatPollCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (poll: ChatPollInput) => Promise<void> | void;
};

export function ChatPollCreateDialog({ open, onOpenChange, onCreate }: ChatPollCreateDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuestion("");
      setOptions(["", ""]);
    }
  }, [open]);

  const submit = async () => {
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!cleanQuestion || cleanOptions.length < 2 || cleanOptions.length > 10) return;
    setCreating(true);
    try {
      await onCreate({ question: cleanQuestion, options: cleanOptions });
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BarChart3 size={18} /> Create poll</DialogTitle>
          <DialogDescription>Ask a question and add between 2 and 10 choices.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Your question" maxLength={500} autoFocus />
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input value={option} onChange={(event) => setOptions((rows) => rows.map((row, rowIndex) => rowIndex === index ? event.target.value : row))} placeholder={`Option ${index + 1}`} maxLength={280} />
              {options.length > 2 ? <Button type="button" variant="ghost" size="icon" onClick={() => setOptions((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Minus size={16} /></Button> : null}
            </div>
          ))}
          {options.length < 10 ? <Button type="button" variant="outline" size="sm" onClick={() => setOptions((rows) => [...rows, ""])}><Plus size={15} className="mr-1" /> Add option</Button> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={creating || !question.trim() || options.filter((option) => option.trim()).length < 2}>Create poll</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
