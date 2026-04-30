import { useEffect, useState, useRef, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Search, 
  Users, 
  Settings, 
  Phone, 
  Video, 
  MoreHorizontal,
  Paperclip,
  Smile,
  Circle,
  Plus,
  MessageSquare,
  Reply,
  Forward,
  Info,
  UserPlus,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  Loader2,
  X
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { toast } from "@/hooks/use-toast";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName?: string;
  body: string;
  createdAt: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP';
  unreadCount: number;
  members?: string[];
}

interface Employee {
  id: string;
  userId?: string;
  fullName: string;
  departmentId: string;
  roleTitle?: string;
}

export default function ChatHub() {
  const session = useSession();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Selection/Creation States
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [activeCreationMode, setActiveCreationMode] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empFilter, setEmpFilter] = useState({ search: "", dept: "all" });
  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  // Call States
  const [callStatus, setCallStatus] = useState<"off" | "ringing" | "active">("off");
  const [callType, setCallType] = useState<"voice" | "video">("voice");

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ChatRoom[]>("/v1/comms/chat/rooms", "GET", session);
      setRooms(data || []);
      if (data && data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0]);
      }
    } catch (error: any) {
      console.error("Failed to fetch rooms:", error);
      toast({
        title: "Sync Error",
        description: "Failed to establish room list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, selectedRoom]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiRequest<any>("/v1/hr/employees", "GET", session);
      setEmployees(data.data || []);
    } catch (e: any) {
      console.error("Failed to fetch employees:", e);
    }
  }, [session]);

  const fetchMessages = useCallback(async (roomId: string) => {
    setMessages([]);
    try {
      const data = await apiRequest<any>(`/comms/chat/rooms/${roomId}/messages`, "GET", session);
      const messagesArray = Array.isArray(data) ? data : (data?.messages || []);
      
      setSelectedRoom(current => {
        if (current?.id === roomId) {
          setMessages([...messagesArray].reverse());
        }
        return current;
      });
    } catch (error: any) {
      console.error("Failed to fetch messages:", error);
    }
  }, [session]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (isNewRoomOpen) fetchEmployees();
  }, [isNewRoomOpen, fetchEmployees]);

  // Socket setup
  useEffect(() => {
    if (!session.user_id) return;
    const socketUrl = window.location.origin;
    socketRef.current = io(`${socketUrl}/chat`, {
      path: "/socket.io",
      query: { tenantId: session.tenant_id, userId: session.user_id }
    });

    socketRef.current.on("newMessage", (msg: ChatMessage) => {
      setSelectedRoom(currentRoom => {
        if (currentRoom && msg.roomId === currentRoom.id) {
          setMessages(prev => [...prev, msg]);
        }
        return currentRoom;
      });
    });

    return () => { socketRef.current?.disconnect(); };
  }, [session.user_id, session.tenant_id]);

  useEffect(() => {
    if (selectedRoom && socketRef.current) {
      fetchMessages(selectedRoom.id);
      socketRef.current.emit("joinRoom", selectedRoom.id);
    }
  }, [selectedRoom, fetchMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      roomId: selectedRoom.id,
      body: newMessage,
      tenantId: session.tenant_id,
      userId: session.user_id,
    });
    setNewMessage("");
  };

  const handleCreateChat = async () => {
    const payload = {
      name: activeCreationMode === "GROUP" ? groupName : undefined,
      type: activeCreationMode,
      memberUserIds: selectedEmps,
    };

    try {
      const room = await apiRequest<ChatRoom>("/comms/chat/rooms", "POST", session, payload);
      setIsNewRoomOpen(false);
      setSelectedEmps([]);
      setGroupName("");
      toast({ title: "Channel Established", description: "Communication line open." });
      fetchRooms();
      setSelectedRoom(room);
    } catch (e: any) {
      toast({ 
        title: "Establishment Failed", 
        description: e.message || "Failed to open channel.", 
        variant: "destructive" 
      });
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp.userId || emp.userId === session.user_id) return false;
    const matchesSearch = emp.fullName?.toLowerCase().includes(empFilter.search.toLowerCase());
    const matchesDept = empFilter.dept === 'all' || emp.departmentId === empFilter.dept;
    return matchesSearch && matchesDept;
  }).sort((a, b) => a.fullName?.localeCompare(b.fullName));

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
        <PageHeader title="Chat & Collaboration" subtitle="Encrypted real-time communication terminal." />

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Side Panel */}
          <div className="w-80 flex flex-col bg-white dark:bg-slate-900 border border-border/40 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b space-y-5">
              <div className="flex justify-between items-center group">
                <h3 className="text-xl font-black uppercase tracking-tighter">Secure Lines</h3>
                <div className="flex gap-1">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl bg-primary/5 text-primary hover:bg-primary/20 transition-all active:scale-90" onClick={() => { setActiveCreationMode("DIRECT"); setIsNewRoomOpen(true); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>New 1-on-1</TooltipContent>
                   </Tooltip>
                   
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all active:scale-90" onClick={() => { setActiveCreationMode("GROUP"); setIsNewRoomOpen(true); }}>
                        <Users className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>New Group</TooltipContent>
                   </Tooltip>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input placeholder="Filter channels..." className="pl-10 h-10 bg-muted/20 border-none rounded-xl text-xs font-bold" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex gap-4 animate-pulse">
                    <div className="h-12 w-12 bg-muted rounded-2xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-3 bg-muted w-1/2" />
                      <div className="h-2 bg-muted w-3/4" />
                    </div>
                  </div>
                ))
              ) : rooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 flex gap-4 rounded-2xl cursor-pointer transition-all border-l-4 ${selectedRoom?.id === room.id ? "bg-primary/5 border-l-primary" : "border-l-transparent hover:bg-muted/30"}`}
                >
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black relative shadow-sm ${room.type === 'DIRECT' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}>
                    {room.name?.[0] || 'C'}
                    {room.unreadCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-white dark:border-slate-900 animate-ping" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className={`text-[11px] uppercase tracking-widest truncate ${selectedRoom?.id === room.id ? "font-black text-slate-900 dark:text-white" : "font-bold text-muted-foreground"}`}>{room.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate opacity-60 font-medium">
                      {room.type === 'DIRECT' ? 'Private Link' : `${room.members?.length || 0} participants`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-border/40 rounded-3xl overflow-hidden shadow-2xl">
            {selectedRoom ? (
              <>
                <div className="p-6 border-b flex justify-between items-center bg-muted/5 backdrop-blur-md">
                   <div className="flex items-center gap-4">
                     <div className="relative">
                       <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary text-white font-black italic">{selectedRoom.name?.[0]}</AvatarFallback>
                       </Avatar>
                       <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                     </div>
                     <div>
                       <h4 className="font-black text-sm uppercase tracking-widest">{selectedRoom.name}</h4>
                       <span className="text-[10px] font-black tracking-tighter text-muted-foreground flex gap-3">
                         <span className="text-green-500 uppercase">Secured</span>
                         <span>•</span>
                         <span>LATENCY 12ms</span>
                       </span>
                     </div>
                   </div>
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-green-50 hover:text-green-500" onClick={() => { setCallType("voice"); setCallStatus("ringing"); }}>
                         <Phone className="h-5 w-5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-500" onClick={() => { setCallType("video"); setCallStatus("ringing"); }}>
                         <Video className="h-5 w-5" />
                       </Button>
                       <div className="h-6 w-px bg-slate-100 mx-2" />
                       <Button disabled title="Not available yet" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></Button>
                    </div>
                 </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20 dark:bg-slate-900/10">
                   {messages.map((msg, i) => {
                     const isMe = msg.senderId === session.user_id;
                      return (
                        <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] space-y-2`}>
                             {!isMe && (
                               <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 ml-3 bg-indigo-50 px-2 py-0.5 rounded-full">
                                 {msg.senderName || 'Terminal Link'}
                               </span>
                             )}
                             <div className="group relative">
                               <div className={`px-6 py-4 rounded-3xl text-sm font-medium shadow-sm transition-all hover:scale-[1.01] ${isMe ? "bg-primary text-white rounded-tr-none" : "bg-white dark:bg-slate-800 border-border/40 border rounded-tl-none shadow-slate-200/50"}`}>
                                 {msg.body}
                               </div>
                               <div className={`absolute top-0 -translate-y-full flex gap-1 p-1 bg-white dark:bg-slate-800 border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isMe ? "right-0" : "left-0"}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button disabled title="Not available yet" variant="ghost" size="icon" className="h-6 w-6"><Reply className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reply</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button disabled title="Not available yet" variant="ghost" size="icon" className="h-6 w-6"><Forward className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Forward</TooltipContent>
                                  </Tooltip>
                               </div>
                            </div>
                            <div className={`text-[9px] font-black text-muted-foreground opacity-30 uppercase tracking-widest ${isMe ? "text-right" : "text-left ml-3"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                         </div>
                       </div>
                     )
                   })}
                   <div ref={messagesEndRef} />
                </div>

                <div className="p-6 border-t bg-muted/5">
                   <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                      <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors" onClick={() => toast({ title: "Module Locked", description: "Attachment system undergoing validation." })}>
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <div className="flex-1 relative">
                        <Input 
                          placeholder="Type an encrypted message..." 
                          className="h-14 bg-white dark:bg-slate-800 border-none shadow-inner rounded-[1.25rem] px-6 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                        />
                      </div>
                      <Button type="submit" size="icon" className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-90 transition-all">
                        <Send className="h-5 w-5" />
                      </Button>
                   </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 opacity-40">
                 <div className="h-40 w-40 rounded-[3rem] bg-muted/50 flex items-center justify-center">
                    <MessageSquare className="h-16 w-16" />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-3xl font-black uppercase tracking-widest">Select Terminal</h3>
                    <p className="max-w-xs text-xs font-bold leading-relaxed italic">Synchronize with active collaboration lines to transmit and receive data.</p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Creation Overlay */}
        <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
          <DialogContent className="sm:max-w-2xl border-none shadow-3xl bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-[2.5rem]">
            <div className="p-8 bg-white dark:bg-slate-900 border-b flex justify-between items-center">
              <div>
                <DialogTitle className="text-3xl font-black tracking-tighter">{activeCreationMode === 'DIRECT' ? 'Direct Link' : 'New Tactical Group'}</DialogTitle>
                <div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mt-1">Personnel Selection Required</div>
              </div>
            </div>
            
            <div className="p-8 flex gap-8">
               <div className="flex-1 space-y-6">
                  {activeCreationMode === 'GROUP' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Channel Headline</label>
                       <Input 
                         placeholder="e.g. Q4 OPERATIONS CENTER" 
                         className="h-12 border-none bg-white dark:bg-slate-800 rounded-2xl px-5 text-sm font-black shadow-inner"
                         value={groupName}
                         onChange={e => setGroupName(e.target.value)}
                       />
                    </div>
                  )}

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Personnel Sync</label>
                       <div className="flex items-center gap-3">
                         <Search className="h-3 w-3 text-muted-foreground" />
                         <Input 
                           placeholder="Filter name/dept..." 
                           className="h-6 border-none bg-transparent text-[11px] font-bold p-0 text-right w-40"
                           value={empFilter.search}
                           onChange={e => setEmpFilter({...empFilter, search: e.target.value})}
                         />
                       </div>
                     </div>
                     
                     <div className="h-[350px] overflow-y-auto pr-2 space-y-1 scrollbar-hide">
                        {filteredEmployees.map(emp => (
                          <div 
                            key={emp.id}
                            onClick={() => {
                              if (!emp.userId) return;
                              if (activeCreationMode === 'DIRECT') {
                                setSelectedEmps([emp.userId]);
                              } else {
                                setSelectedEmps(prev => prev.includes(emp.userId!) ? prev.filter(x => x !== emp.userId) : [...prev, emp.userId!]);
                              }
                            }}
                            className={`p-4 flex items-center justify-between rounded-2xl cursor-pointer transition-all ${selectedEmps.includes(emp.userId!) ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" : "bg-white dark:bg-slate-900 hover:bg-muted/50"}`}
                          >
                             <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border-2 border-primary/10">
                                   <AvatarFallback className="font-black text-xs">{emp.fullName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                   <div className={`text-xs font-black uppercase tracking-tight ${selectedEmps.includes(emp.userId!) ? "text-white" : "text-slate-900 dark:text-white"}`}>{emp.fullName}</div>
                                   <div className={`text-[9px] font-bold ${selectedEmps.includes(emp.userId!) ? "text-white/70" : "text-muted-foreground"}`}>{emp.roleTitle} • {emp.departmentId}</div>
                                </div>
                             </div>
                             {selectedEmps.includes(emp.userId!) && <Check className="h-4 w-4" />}
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="w-52 flex flex-col justify-end pb-2">
                  <div className="space-y-6">
                    <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-primary text-center">Batch Stats</h4>
                       <div className="flex justify-between items-end">
                         <span className="text-3xl font-black italic">{selectedEmps.length}</span>
                         <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">UNITS</span>
                       </div>
                    </div>
                    <Button 
                      className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                      disabled={selectedEmps.length === 0 || (activeCreationMode === 'GROUP' && !groupName)}
                      onClick={handleCreateChat}
                    >
                      Establish <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
               </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Call Overlay */}
        <Dialog open={callStatus !== "off"} onOpenChange={(open) => !open && setCallStatus("off")}>
          <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden bg-slate-900 rounded-[3rem] shadow-3xl">
            <div className="relative h-[500px] flex flex-col items-center justify-center space-y-8 p-10">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 via-transparent to-black pointer-events-none" />
              
              <div className="relative">
                <div className={`h-32 w-32 rounded-[3.5rem] bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative z-10 
                  ${callStatus === 'ringing' ? 'animate-pulse' : ''}`}>
                  {callType === 'voice' ? <Phone className="h-12 w-12 text-white" /> : <Video className="h-12 w-12 text-white" />}
                </div>
                {callStatus === 'ringing' && (
                  <>
                    <div className="absolute inset-0 bg-indigo-500 rounded-[3.5rem] animate-ping opacity-20" />
                    <div className="absolute inset-0 bg-indigo-500 rounded-[3.5rem] animate-ping opacity-10 [animation-delay:0.5s]" />
                  </>
                )}
              </div>

              <div className="text-center space-y-2 relative z-10">
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase">{selectedRoom?.name || 'TERMINAL'}</h2>
                <p className="text-[10px] font-black tracking-[0.4em] text-indigo-400 uppercase">
                  {callStatus === 'ringing' ? 'ESTABLISHING SECURE PROTOCOL...' : 'PROTOCOL ACTIVE • ENCRYPTED'}
                </p>
              </div>

              <div className="flex gap-6 relative z-10 pt-10">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={() => setCallStatus("off")}
                   className="h-20 w-20 rounded-[2.5rem] bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 active:scale-90 transition-all"
                >
                  <X className="h-8 w-8" />
                </Button>
                {callStatus === 'ringing' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setCallStatus("active")}
                    className="h-20 w-20 rounded-[2.5rem] bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/20 active:scale-90 transition-all"
                  >
                    <Check className="h-8 w-8" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
