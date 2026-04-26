import { useState, useCallback, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Phone, 
  Mail, 
  MessageSquare, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Zap, 
  User, 
  ShieldCheck, 
  Clock,
  CheckCheck,
  Globe,
  Star,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/core/security/session";
import { marketingService } from "@/core/services/marketing/marketingService";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  sender: "contact" | "system";
  text: string;
  timestamp: string;
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  status: "sent" | "delivered" | "read";
}

interface Conversation {
  id: string;
  contactName: string;
  contactEmail: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  score: number;
  intent: "HIGH" | "MEDIUM" | "LOW";
}

export default function OmnichannelInbox() {
  const session = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  // Mock data initialization
  useEffect(() => {
    const mockConvs: Conversation[] = [
      { id: "c1", contactName: "Sarah Jenkins", contactEmail: "sarah@enterprise.com", lastMessage: "Can we schedule a demo for next Tuesday?", lastTimestamp: "10:24 AM", unreadCount: 2, channel: "WHATSAPP", score: 85, intent: "HIGH" },
      { id: "c2", contactName: "Michael Chen", contactEmail: "m.chen@techglobal.io", lastMessage: "Thanks for the whitepaper. Looking forward to it.", lastTimestamp: "Yesterday", unreadCount: 0, channel: "EMAIL", score: 62, intent: "MEDIUM" },
      { id: "c3", contactName: "David Miller", contactEmail: "david@retailflow.com", lastMessage: "Is the discount still valid?", lastTimestamp: "2 days ago", unreadCount: 0, channel: "SMS", score: 45, intent: "LOW" },
    ];
    
    const mockMsgs: Message[] = [
      { id: "m1", sender: "contact", text: "Hi, I saw your latest campaign about growth automation.", timestamp: "10:15 AM", channel: "WHATSAPP", status: "read" },
      { id: "m2", sender: "system", text: "Hello Sarah! Yes, it's one of our most popular solutions. Would you like to see a demo?", timestamp: "10:18 AM", channel: "WHATSAPP", status: "read" },
      { id: "m3", sender: "contact", text: "Can we schedule a demo for next Tuesday?", timestamp: "10:24 AM", channel: "WHATSAPP", status: "read" },
    ];

    setConversations(mockConvs);
    setSelectedConv(mockConvs[0]);
    setMessages(mockMsgs);
    setLoading(false);
  }, []);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedConv) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      sender: "system",
      text: inputText,
      timestamp: "Just now",
      channel: selectedConv.channel,
      status: "sent"
    };
    setMessages([...messages, newMsg]);
    setInputText("");
  };

  if (loading) return <div className="p-8 text-center">Initializing Unified Inbox...</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] gap-0 overflow-hidden bg-background border rounded-2xl shadow-xl m-4">
      {/* Sidebar: Conversations */}
      <div className="w-80 border-r flex flex-col bg-muted/10">
         <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold">Unified Inbox</h2>
               <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input placeholder="Search messages..." className="pl-9 h-9" />
            </div>
            <div className="flex gap-1">
               <Badge variant="secondary" className="cursor-pointer">All</Badge>
               <Badge variant="outline" className="cursor-pointer">Unread</Badge>
               <Badge variant="outline" className="cursor-pointer">High Intent</Badge>
            </div>
         </div>
         <ScrollArea className="flex-1">
            <div className="p-0">
               {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 text-left transition-colors border-b last:border-0",
                      selectedConv?.id === conv.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"
                    )}
                  >
                     <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                           {conv.contactName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                     </Avatar>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                           <p className="text-sm font-bold truncate">{conv.contactName}</p>
                           <span className="text-[10px] text-muted-foreground uppercase">{conv.lastTimestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                        <div className="flex items-center justify-between mt-2">
                           <div className="flex items-center gap-1.5">
                              {conv.channel === 'WHATSAPP' && <MessageSquare className="h-3 w-3 text-green-500" />}
                              {conv.channel === 'EMAIL' && <Mail className="h-3 w-3 text-blue-500" />}
                              {conv.channel === 'SMS' && <Phone className="h-3 w-3 text-orange-500" />}
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{conv.channel}</span>
                           </div>
                           {conv.unreadCount > 0 && (
                              <Badge className="h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold">
                                 {conv.unreadCount}
                              </Badge>
                           )}
                        </div>
                     </div>
                  </button>
               ))}
            </div>
         </ScrollArea>
      </div>

      {/* Main Area: Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
         {selectedConv ? (
            <>
               <div className="p-4 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                     <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                           {selectedConv.contactName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                     </Avatar>
                     <div>
                        <h3 className="text-sm font-bold">{selectedConv.contactName}</h3>
                        <div className="flex items-center gap-2">
                           <span className="h-2 w-2 rounded-full bg-green-500" />
                           <span className="text-[10px] text-muted-foreground">Active via {selectedConv.channel}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm"><Zap className="mr-2 h-4 w-4" /> Run Automation</Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </div>
               </div>

               <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6 max-w-3xl mx-auto">
                     <div className="text-center">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/30">
                           Conversation started on June 24, 2024
                        </Badge>
                     </div>
                     
                     {messages.map((msg) => (
                        <div key={msg.id} className={cn(
                          "flex flex-col gap-1",
                          msg.sender === 'system' ? "items-end" : "items-start"
                        )}>
                           <div className={cn(
                              "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                              msg.sender === 'system' 
                                 ? "bg-primary text-primary-foreground rounded-tr-none" 
                                 : "bg-muted text-foreground rounded-tl-none border"
                           )}>
                              {msg.text}
                           </div>
                           <div className="flex items-center gap-2 px-1">
                              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">{msg.timestamp}</span>
                              {msg.sender === 'system' && (
                                 <CheckCheck className={cn("h-3 w-3", msg.status === 'read' ? "text-blue-400" : "text-muted-foreground")} />
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </ScrollArea>

               <div className="p-4 border-t shrink-0">
                  <div className="max-w-3xl mx-auto flex gap-3">
                     <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                     <div className="flex-1 relative">
                        <Input 
                          placeholder={`Reply via ${selectedConv.channel}...`} 
                          className="h-10 pr-10"
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8"><Smile className="h-4 w-4 text-muted-foreground" /></Button>
                     </div>
                     <Button className="h-10 px-4 shrink-0" onClick={handleSendMessage}>
                        <Send className="h-4 w-4 mr-2" /> Send
                     </Button>
                  </div>
               </div>
            </>
         ) : (
            <div className="flex-1 flex items-center justify-center">
               <div className="text-center">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                     <MessageSquare className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">Select a Conversation</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                     Pick a contact from the list to view the message history and start a conversation.
                  </p>
               </div>
            </div>
         )}
      </div>

      {/* Right Sidebar: Contact Insights */}
      {selectedConv && (
         <div className="w-72 border-l bg-muted/5 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-6 text-center border-b">
               <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-background shadow-lg">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                     {selectedConv.contactName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
               </Avatar>
               <h3 className="font-bold text-lg">{selectedConv.contactName}</h3>
               <p className="text-xs text-muted-foreground mb-4">{selectedConv.contactEmail}</p>
               <div className="flex justify-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><Phone className="h-3 w-3" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><Mail className="h-3 w-3" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><Star className="h-3 w-3" /></Button>
               </div>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Insights</p>
                  <div className="bg-background border rounded-xl p-4 shadow-sm space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">Growth Score</span>
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold">{selectedConv.score}</Badge>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                           <span>Intent Level</span>
                           <span className={cn(selectedConv.intent === 'HIGH' ? "text-green-500" : "text-muted-foreground")}>{selectedConv.intent}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                           <div className={cn("h-full", selectedConv.intent === 'HIGH' ? "bg-green-500" : "bg-primary")} style={{ width: `${selectedConv.score}%` }} />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Attributes</p>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3" /> Location</span>
                        <span className="font-medium">San Francisco, CA</span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-2"><User className="h-3 w-3" /> Industry</span>
                        <span className="font-medium">Technology</span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" /> Timezone</span>
                        <span className="font-medium">PST (UTC-8)</span>
                     </div>
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Campaigns</p>
                     <Badge variant="outline" className="text-[8px] h-4">2 Active</Badge>
                  </div>
                  <div className="space-y-2">
                     <div className="bg-muted/50 p-2 rounded-lg text-[10px] font-medium flex items-center justify-between">
                        <span>Summer Growth 2024</span>
                        <ChevronRight className="h-3 w-3" />
                     </div>
                     <div className="bg-muted/50 p-2 rounded-lg text-[10px] font-medium flex items-center justify-between">
                        <span>Enterprise Retargeting</span>
                        <ChevronRight className="h-3 w-3" />
                     </div>
                  </div>
               </div>

               <Button variant="outline" className="w-full text-xs" asChild>
                  <Link to={`/core/marketing/customer-360?id=${selectedConv.id}`}>
                     <ExternalLink className="mr-2 h-3 w-3" />
                     View Full Customer 360
                  </Link>
               </Button>
            </div>
         </div>
      )}
    </div>
  );
}
