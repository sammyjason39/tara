import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Inbox, 
  Send, 
  File, 
  Trash2, 
  Star, 
  Plus, 
  Search,
  MoreVertical,
  Paperclip,
  Clock,
  Archive,
  RefreshCw,
  X,
  Reply,
  Forward,
  ChevronRight,
  User,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MailMessage {
  id: string;
  subject: string;
  bodyText: string;
  fromAddress: string;
  toAddresses: string[];
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
}

interface MailAccount {
  id: string;
  internalEmail: string;
  address: string;
}

export default function MailHub() {
  const session = useSession();
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "", status: "draft" });
  const [filter, setFilter] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userAccount, setUserAccount] = useState<MailAccount | null>(null);

  const { fetchCounts } = useNotifications();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/comms/mail/messages?folder=${activeFolder}`, "GET", session);
      setMessages(data.data || []);
      setUserAccount(data.account);
    } catch (error: any) {
      console.error("Failed to fetch mail:", error);
      toast({
        title: "Sync Error",
        description: error.message || "Failed to synchronize mail account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, activeFolder]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSelectMail = async (mail: MailMessage) => {
    setSelectedMail(mail);
    if (!mail.isRead) {
      try {
        await apiRequest(`/comms/mail/${mail.id}/read`, "PATCH", session);
        setMessages(prev => prev.map(m => m.id === mail.id ? { ...m, isRead: true } : m));
        await fetchCounts();
      } catch (e) {
        console.error("Failed to mark read:", e);
      }
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, mailId: string) => {
    e.stopPropagation();
    try {
      await apiRequest(`/comms/mail/${mailId}/star`, "PATCH", session);
      setMessages(prev => prev.map(m => m.id === mailId ? { ...m, isStarred: !m.isStarred } : m));
      if (selectedMail && selectedMail.id === mailId) {
        setSelectedMail({ ...selectedMail, isStarred: !selectedMail.isStarred });
      }
    } catch (e: any) {
      toast({ 
        title: "Action Failed", 
        description: e.message || "Failed to update star status.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteMail = async (id: string) => {
    try {
      await apiRequest(`/comms/mail/${id}`, "DELETE", session);
      toast({ title: "Updated", description: "Message status updated." });
      setSelectedMail(null);
      fetchMessages();
    } catch (e: any) {
      toast({ 
        title: "Deletion Failed", 
        description: e.message || "Operation failed.", 
        variant: "destructive" 
      });
    }
  };

  const handleRestoreMail = async (id: string) => {
    try {
      await apiRequest(`/comms/mail/${id}/restore`, "PATCH", session);
      toast({ title: "Restored", description: "Message moved back to Inbox." });
      setSelectedMail(null);
      fetchMessages();
    } catch (e: any) {
      toast({ 
        title: "Restore Failed", 
        description: e.message || "Restore operation failed.", 
        variant: "destructive" 
      });
    }
  };

  const handleSendMail = async (status: string = "sent") => {
    if (status === "sent" && (!composeData.to || !composeData.subject)) {
      toast({ title: "Incomplete", description: "Recipient and Subject are required.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        toAddresses: (composeData.to || "").split(/[,;]/).map(a => a.trim()).filter(Boolean),
        subject: composeData.subject,
        bodyText: composeData.body,
        status: status,
      };

      await apiRequest("/comms/mail/send", "POST", session, payload);

      toast({ 
        title: "Success", 
        description: status === 'draft' ? "Draft saved." : "Mail dispatched successfully." 
      });
      setIsComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "", status: "sent" });
      fetchMessages();
    } catch (e: any) {
      toast({ 
        title: "Transmission Failed", 
        description: e.message || "Service currently unavailable.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.subject?.toLowerCase().includes(filter.toLowerCase()) || 
    m.fromAddress?.toLowerCase().includes(filter.toLowerCase()) ||
    m.bodyText?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col h-[calc(100vh-140px)] gap-6 p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {/* Top Action Bar */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search in mail..." 
                  className="pl-12 h-11 bg-slate-50 border-none rounded-2xl font-bold text-xs"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
             </div>
             <Button variant="ghost" size="icon" onClick={fetchMessages} className="rounded-xl h-11 w-11 shadow-none">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             </Button>
          </div>
          <div className="flex items-center gap-4">
             {userAccount && (
                <Badge variant="outline" className="h-8 px-4 rounded-full border-primary/20 bg-primary/5 text-primary lowercase font-mono">
                   {userAccount.address}
                </Badge>
             )}
             <Button onClick={() => { setComposeData({to:"", subject:"", body:"", status: "sent"}); setIsComposeOpen(true); }} className="h-11 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> Compose
             </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 flex flex-col gap-2">
            {[
              { id: 'inbox', icon: Inbox, label: "Inbox" },
              { id: 'sent', icon: Send, label: "Sent" },
              { id: 'drafts', icon: File, label: "Drafts" },
              { id: 'starred', icon: Star, label: "Starred" },
              { id: 'trash', icon: Trash2, label: "Trash" },
            ].map((item) => (
              <Button 
                key={item.id} 
                variant={activeFolder === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start h-12 rounded-2xl px-5 font-black uppercase tracking-[0.2em] text-[10px] transition-all group ${activeFolder === item.id ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-white'}`}
                onClick={() => { setActiveFolder(item.id); setSelectedMail(null); }}
              >
                <item.icon className={`h-4 w-4 mr-4 transition-transform group-hover:scale-110 ${activeFolder === item.id ? 'text-primary' : ''}`} />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Master-Detail Container */}
          <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-[2.5rem] border overflow-hidden shadow-2xl relative min-h-0">
            {/* List Column */}
            <div className={`flex flex-col border-r bg-slate-50/30 transition-all duration-500 ${selectedMail ? 'w-[380px] shrink-0 opacity-100' : 'w-full'}`}>
              <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                {loading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="p-5 border-b flex gap-4 animate-pulse">
                      <div className="h-10 w-10 bg-muted rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted w-1/4 rounded" />
                        <div className="h-3 bg-muted w-3/4 rounded" />
                      </div>
                    </div>
                  ))
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-24 text-center">
                    <Inbox className="h-16 w-16 mb-4" />
                    <h3 className="text-lg font-black uppercase tracking-widest">No Messages</h3>
                    <p className="text-[10px] font-bold">This folder is currently empty.</p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      onClick={() => handleSelectMail(msg)}
                      className={`flex items-start gap-4 p-5 border-b cursor-pointer transition-all hover:bg-slate-50 relative group ${selectedMail?.id === msg.id ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-500/20' : ''} ${!msg.isRead ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary shadow-sm' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${!msg.isRead ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {msg.fromAddress?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-6 w-6 rounded-md hover:scale-120 transition-all ${msg.isStarred ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                          onClick={(e) => handleToggleStar(e, msg.id)}
                        >
                          <Star className={`h-3.5 w-3.5 ${msg.isStarred ? 'fill-amber-500' : ''}`} />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] uppercase font-black tracking-widest truncate ${!msg.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                            {activeFolder === 'sent' ? `To: ${msg.toAddresses?.[0] || 'Unknown'}` : (msg.fromAddress || 'System Correspondence')}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 shrink-0 whitespace-nowrap ml-2">
                             {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <h4 className={`text-sm truncate mb-0.5 ${!msg.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{msg.subject}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">{msg.bodyText}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Detail Column */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-slate-950 transition-all duration-300 relative ${!selectedMail ? 'hidden md:flex' : 'flex'}`}>
               {selectedMail ? (
                 <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
                   <div className="p-6 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setSelectedMail(null)}>
                            <ChevronRight className="h-5 w-5 rotate-180" />
                         </Button>
                         <div className="h-6 w-px bg-slate-100 mx-2" />
                         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-500" onClick={() => handleDeleteMail(selectedMail.id)}>
                            <Trash2 className="h-5 w-5" />
                         </Button>
                         {activeFolder === 'trash' && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-green-50 hover:text-green-500" onClick={() => handleRestoreMail(selectedMail.id)}>
                               <RefreshCw className="h-5 w-5" />
                            </Button>
                         )}
                         <Button variant="ghost" size="icon" className={`h-10 w-10 rounded-xl ${selectedMail.isStarred ? 'text-amber-500' : ''}`} onClick={(e) => handleToggleStar(e, selectedMail.id)}>
                            <Star className={`h-5 w-5 ${selectedMail.isStarred ? 'fill-amber-500' : ''}`} />
                         </Button>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => {
                            setComposeData({ to: selectedMail.fromAddress, subject: `RE: ${selectedMail.subject}`, body: `\n\n--- Original Message from ${selectedMail.fromAddress} ---\n${selectedMail.bodyText}`, status: "sent" });
                            setIsComposeOpen(true);
                         }}>
                            <Reply className="h-3.5 w-3.5 mr-2" /> Reply
                         </Button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-10 space-y-8">
                      <div className="space-y-6">
                         <h2 className="text-4xl font-black tracking-tighter leading-none text-slate-900">{selectedMail.subject}</h2>
                         <div className="flex items-center gap-4 py-4 border-y border-slate-50">
                            <div className="h-12 w-12 rounded-[1.25rem] bg-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
                               {selectedMail.fromAddress?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1">
                               <div className="flex justify-between items-center">
                                  <span className="font-black text-sm uppercase tracking-widest text-slate-800">{selectedMail.fromAddress}</span>
                                  <span className="text-[10px] font-black text-slate-400">{new Date(selectedMail.createdAt).toLocaleString()}</span>
                               </div>
                               <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                  to {selectedMail.toAddresses?.join(', ')}
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="text-base text-slate-700 leading-relaxed font-medium whitespace-pre-wrap tracking-tight min-h-[300px]">
                         {selectedMail.bodyText}
                      </div>

                      <div className="pt-10 border-t border-slate-50 flex gap-4 pb-12">
                         <Button onClick={() => {
                            setComposeData({ to: selectedMail.fromAddress, subject: `RE: ${selectedMail.subject}`, body: `\n\n--- Original Message ---\n${selectedMail.bodyText}`, status: "sent" });
                            setIsComposeOpen(true);
                         }} className="rounded-2xl h-14 px-8 bg-slate-900 font-black uppercase tracking-widest text-[10px]">
                            Reply
                         </Button>
                         <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => {
                            setComposeData({ to: "", subject: `FWD: ${selectedMail.subject}`, body: `\n\n--- Forwarded Message ---\n${selectedMail.bodyText}`, status: "sent" });
                            setIsComposeOpen(true);
                         }}>
                            Forward
                         </Button>
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-slate-50/10 animate-in fade-in zoom-in-95 duration-1000">
                    <div className="h-24 w-24 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 opacity-40">
                       <Inbox className="h-10 w-10 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Message Intelligence</h2>
                    <p className="text-xs font-bold text-slate-400 mt-2">Select correspondence from the queue to decrypt and view full payload.</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Compose Dialog */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="sm:max-w-2xl border-none shadow-3xl rounded-[3rem] bg-white p-0 overflow-hidden">
            <DialogHeader className="p-8 border-b bg-slate-50">
              <div className="flex justify-between items-center">
                <DialogTitle className="text-2xl font-black tracking-tighter">New Correspondence</DialogTitle>
                <div className="flex gap-2">
                   <Button variant="ghost" size="icon" onClick={() => handleSendMail('draft')} className="h-11 w-11 rounded-xl text-slate-400 hover:text-primary"><File className="h-5 w-5" /></Button>
                   <Button variant="ghost" size="icon" onClick={() => setIsComposeOpen(false)} className="h-11 w-11 rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-10 space-y-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-6 border-b pb-4 border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] w-20 text-slate-400">Recipient</span>
                    <Input 
                      placeholder="address@zenvix.io" 
                      className="border-none bg-transparent p-0 text-sm font-black focus-visible:ring-0 placeholder:opacity-30"
                      value={composeData.to}
                      onChange={e => setComposeData({...composeData, to: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-6 border-b pb-4 border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] w-20 text-slate-400">Subject</span>
                    <Input 
                      placeholder="Subject of transmission" 
                      className="border-none bg-transparent p-0 text-sm font-black focus-visible:ring-0 placeholder:opacity-30"
                      value={composeData.subject}
                      onChange={e => setComposeData({...composeData, subject: e.target.value})}
                    />
                  </div>
               </div>
               
               <Textarea 
                 placeholder="Draft your organizational intelligence here..." 
                 className="min-h-[350px] border-none bg-slate-50/50 rounded-[2rem] p-10 text-sm font-bold leading-relaxed focus-visible:ring-1 focus-visible:ring-primary/10 shadow-inner"
                 value={composeData.body}
                 onChange={e => setComposeData({...composeData, body: e.target.value})}
               />
               
               <div className="flex justify-between items-center">
                  <Button variant="ghost" className="h-14 px-8 font-black uppercase tracking-widest text-[10px] text-rose-500 hover:bg-rose-50" onClick={() => setIsComposeOpen(false)}>Discard</Button>
                  <Button 
                    className="h-14 px-12 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-900/40 font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50"
                    onClick={() => handleSendMail('sent')}
                    disabled={isSending}
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Send className="h-4 w-4 mr-4" />}
                    Transmit Now
                  </Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
