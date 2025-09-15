import React, { useEffect, useState } from "react";
import { agentSDK } from "@/agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send } from "lucide-react";

export default function Assistant() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");

  // Initialize conversation (reuse last, or create new)
  useEffect(() => {
    let unsub = null;

    const init = async () => {
      const list = agentSDK.listConversations({ agent_name: "operations_agent" }) || [];
      let conv = list?.[0];
      if (!conv) {
        conv = agentSDK.createConversation({
          agent_name: "operations_agent",
          metadata: { name: "Operations Assistant", description: "Conversational assistant for Muscat Bay" }
        });
      }
      setConversation(conv);
      setMessages(conv.messages || []);
      unsub = agentSDK.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    };

    init();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const send = async () => {
    const content = text.trim();
    if (!content || !conversation) return;
    setPending(true);
    setText("");
    await agentSDK.addMessage(conversation, { role: "user", content });
    setPending(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-6">
      <Card className="bg-white dark:bg-gray-800 shadow-lg max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-gray-900 dark:text-white">AI Assistant</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ask about water, electricity, HVAC, firefighting, STP, and more.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[55vh] md:h-[60vh] overflow-y-auto p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                Start the conversation by asking a question (e.g., “Summarize Zone_01_(FM) losses for Jul 2025”).
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`${m.role === "user" ? "bg-slate-800 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"} max-w-[85%] rounded-2xl px-4 py-2`}>
                      <div className="text-sm whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={pending} className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white">
              <Send className="w-4 h-4 mr-1" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}