import { useEffect, useState, useRef } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Send, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

const UserMessagesPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [proId, setProId] = useState<string | null>(null);
  const [proName, setProName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Find linked professional
      const { data: link } = await supabase
        .from("client_links")
        .select("professional_id")
        .eq("client_user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!link) {
        setLoading(false);
        return;
      }

      setProId(link.professional_id);

      const [msgsRes, profRes] = await Promise.all([
        supabase
          .from("messages" as any)
          .select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${link.professional_id}),and(sender_id.eq.${link.professional_id},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("full_name, email").eq("id", link.professional_id).single(),
      ]);

      setMessages((msgsRes.data as any[]) ?? []);
      setProName(profRes.data?.full_name || profRes.data?.email || "Nutrizionista");
      setLoading(false);

      // Mark unread as read
      await supabase
        .from("messages" as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq("sender_id", link.professional_id)
        .eq("receiver_id", user.id)
        .is("read_at", null);
    };
    load();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user || !proId) return;
    const channel = supabase
      .channel("messages-user")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === proId) ||
            (msg.sender_id === proId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            if (msg.receiver_id === user.id) {
              supabase.from("messages" as any).update({ read_at: new Date().toISOString() } as any).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, proId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !user || !proId) return;
    setSending(true);
    const content = newMsg.trim();
    const { data, error } = await supabase.from("messages" as any).insert({
      sender_id: user.id,
      receiver_id: proId,
      content,
    } as any).select().single();
    if (!error && data) {
      setMessages((prev) => [...prev, data as unknown as Message]);
    }
    setNewMsg("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Chat" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!proId) {
    return (
      <div>
        <MobileHeader title="Chat" />
        <main className="px-4 py-10 text-center space-y-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Collega un nutrizionista per iniziare a chattare.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <MobileHeader title={`Dott. ${proName}`} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Nessun messaggio ancora. Scrivi per iniziare!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl ${
                  isMine
                    ? "bg-primary/10 text-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3 flex gap-2 bg-card safe-bottom">
        <Textarea
          placeholder="Scrivi un messaggio..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !newMsg.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default UserMessagesPage;
