import * as React from "react";
import { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Video, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function AppointmentDesk() {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const appointments = [
    {
      id: "1",
      title: "Strategy Session",
      customer: "Alex Rivera",
      time: "10:00 AM - 11:00 AM",
      date: "Today",
      type: "Video",
      status: "Confirmed",
      avatar: "AR"
    },
    {
      id: "2",
      title: "Product Demo",
      customer: "Sarah Chen",
      time: "2:30 PM - 3:00 PM",
      date: "Today",
      type: "In-Person",
      status: "Pending",
      avatar: "SC"
    },
    {
      id: "3",
      title: "Onboarding Call",
      customer: "Marcus Wright",
      time: "9:00 AM - 10:00 AM",
      date: "Tomorrow",
      type: "Phone",
      status: "Confirmed",
      avatar: "MW"
    }
  ];

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage schedules, bookings, and customer meetings.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-muted p-1 rounded-lg mr-4">
             <Button 
               variant={view === "calendar" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8"
               onClick={() => setView("calendar")}
             >
               Calendar
             </Button>
             <Button 
               variant={view === "list" ? "secondary" : "ghost"} 
               size="sm" 
               className="h-8"
               onClick={() => setView("list")}
             >
               List
             </Button>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Main Calendar/List Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
          {view === "calendar" ? (
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-4">
                   <h2 className="text-xl font-bold">October 2023</h2>
                   <div className="flex gap-1">
                     <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                     <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                   </div>
                </div>
                <Button variant="outline" size="sm">Today</Button>
              </CardHeader>
              <Separator />
              <div className="flex-1 grid grid-cols-7 border-b">
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                   <div key={day} className="text-center py-2 text-xs font-semibold text-muted-foreground bg-muted/30 border-r last:border-r-0">
                     {day}
                   </div>
                 ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto">
                 {Array.from({ length: 35 }).map((_, i) => (
                   <div key={i} className="min-h-[100px] border-r border-b p-2 hover:bg-muted/30 transition-colors last:border-r-0">
                     <span className={`text-xs font-medium ${(i + 1) === 26 ? 'bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center rounded-full' : 'text-muted-foreground'}`}>
                       {(i % 31) + 1}
                     </span>
                     { (i + 1) === 26 && (
                       <div className="mt-2 space-y-1">
                         <div className="text-[10px] bg-blue-500/10 text-blue-500 p-1 rounded border border-blue-500/20 truncate font-medium">
                           10:00 Strategy Session
                         </div>
                         <div className="text-[10px] bg-orange-500/10 text-orange-500 p-1 rounded border border-orange-500/20 truncate font-medium">
                           14:30 Product Demo
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
              </div>
            </Card>
          ) : (
            <Card className="flex-1">
              <ScrollArea className="h-full">
                <div className="p-0">
                   {appointments.map((apt) => (
                     <div key={apt.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                           <Avatar>
                             <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{apt.avatar}</AvatarFallback>
                           </Avatar>
                           <div>
                             <p className="font-semibold text-sm">{apt.title}</p>
                             <p className="text-xs text-muted-foreground">{apt.customer} • {apt.time}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <Badge variant={apt.status === 'Confirmed' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                             {apt.status}
                           </Badge>
                           <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                     </div>
                   ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Upcoming & Stats */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg">Upcoming Today</CardTitle>
               <CardDescription>You have 2 meetings today</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                {appointments.slice(0, 2).map(apt => (
                  <div key={apt.id} className="flex gap-4 p-3 rounded-lg border bg-card hover:shadow-sm transition-all group">
                     <div className="h-10 w-10 shrink-0 rounded bg-primary/10 flex flex-col items-center justify-center text-primary">
                        <span className="text-[10px] uppercase font-bold leading-none">Oct</span>
                        <span className="text-lg font-bold leading-none">26</span>
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{apt.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                           <Clock className="h-3 w-3" />
                           {apt.time}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant="outline" className="text-[10px] h-5">
                             {apt.type === 'Video' ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                             {apt.type}
                           </Badge>
                        </div>
                     </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full text-xs" size="sm">View All Schedule</Button>
             </CardContent>
           </Card>

           <Card className="bg-primary/5 border-primary/10">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Availability Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Hours</span>
                    <span className="text-sm font-bold">18h / week</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="text-sm font-bold text-green-500">1.2h (Avg)</span>
                 </div>
                 <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden mt-4">
                    <div className="bg-primary h-full w-[75%]" />
                 </div>
                 <p className="text-[10px] text-muted-foreground text-center">75% Capacity Utilized</p>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
