import * as React from "react";
import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  ShoppingBag, 
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function Customer360Desk() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Mock data for initial UI
  const mockCustomers = [
    {
      id: "1",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      phone: "+1 (555) 123-4567",
      score: 85,
      status: "Active",
      lastInteraction: "2 hours ago",
      type: "High Value",
      avatar: "AR"
    },
    {
      id: "2",
      name: "Sarah Chen",
      email: "sarah.c@techcorp.io",
      phone: "+1 (555) 987-6543",
      score: 92,
      status: "Engaged",
      lastInteraction: "1 day ago",
      type: "Enterprise",
      avatar: "SC"
    }
  ];

  const interactions = [
    { type: "email", title: "Product Update Sent", date: "Today, 10:45 AM", status: "Opened" },
    { type: "call", title: "Discovery Call", date: "Yesterday, 2:30 PM", status: "Completed" },
    { type: "purchase", title: "Premium Plan Upgrade", date: "Oct 24, 2023", status: "$2,400.00" },
    { type: "ticket", title: "Billing Question", date: "Oct 22, 2023", status: "Resolved" },
    { type: "web", title: "Viewed Pricing Page", date: "Oct 21, 2023", status: "3m 45s" }
  ];

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer 360</h1>
          <p className="text-muted-foreground">Unified view of customer interactions and intelligence.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="sm">
            <User className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Sidebar: Search & List */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Card className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-0">
                {mockCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${selectedCustomer?.id === customer.id ? 'bg-muted' : ''}`}
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                        {customer.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{customer.name}</p>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                          {customer.score}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span>
                         <span className="text-[10px] text-muted-foreground uppercase">{customer.status}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Section: Details & Timeline */}
        <div className="col-span-12 lg:col-span-8 overflow-hidden">
          {selectedCustomer ? (
            <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
              {/* Profile Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarFallback className="text-xl font-bold bg-primary/5 text-primary">
                          {selectedCustomer.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                            {selectedCustomer.type}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedCustomer.email}</span>
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedCustomer.phone}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> New York, USA</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon"><MessageSquare className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon"><Calendar className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="space-y-1 border-l-2 border-primary/20 pl-4">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Customer Score</p>
                      <p className="text-2xl font-bold text-primary">{selectedCustomer.score}</p>
                    </div>
                    <div className="space-y-1 border-l-2 border-blue-500/20 pl-4">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Lifetime Value</p>
                      <p className="text-2xl font-bold">$12,450</p>
                    </div>
                    <div className="space-y-1 border-l-2 border-orange-500/20 pl-4">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Risk Level</p>
                      <p className="text-2xl font-bold text-orange-500">Low</p>
                    </div>
                    <div className="space-y-1 border-l-2 border-green-500/20 pl-4">
                      <p className="text-xs text-muted-foreground uppercase font-medium">NPS</p>
                      <p className="text-2xl font-bold text-green-500">9.2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Content Tabs */}
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="timeline" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {interactions.map((item, i) => (
                          <div key={i} className="flex gap-4 relative">
                            {i !== interactions.length - 1 && (
                              <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border" />
                            )}
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border bg-background z-10`}>
                              {item.type === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                              {item.type === 'call' && <Phone className="h-4 w-4 text-green-500" />}
                              {item.type === 'purchase' && <ShoppingBag className="h-4 w-4 text-orange-500" />}
                              {item.type === 'ticket' && <ShieldCheck className="h-4 w-4 text-purple-500" />}
                              {item.type === 'web' && <Zap className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <span className="text-xs text-muted-foreground">{item.date}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] py-0">{item.status}</Badge>
                                {item.type === 'purchase' && <Button variant="link" size="sm" className="h-auto p-0 text-xs">View Invoice</Button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Predictive Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Likelihood to Churn</span>
                          <span className="text-sm font-bold text-green-500">12% (Low)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Next Likely Purchase</span>
                          <span className="text-sm font-bold text-primary">Enterprise Pro Plan</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Estimated CLV</span>
                          <span className="text-sm font-bold text-primary">$45,000</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Engagement Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center py-4">
                        <div className="text-4xl font-bold">94%</div>
                        <p className="text-xs text-muted-foreground mt-1">Top 5% of your customer base</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl">
              <div className="text-center">
                <div className="bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No Customer Selected</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">Select a customer from the list to view their 360 profile and history.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
