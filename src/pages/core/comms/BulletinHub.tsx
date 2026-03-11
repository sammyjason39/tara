import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Pin,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Plus,
  Filter,
  Calendar,
  User as UserIcon,
  Search,
  AlertCircle,
  Trash2,
  X,
  Send,
  Loader2,
  ChevronRight,
  User,
} from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BulletinComment {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
}

interface BulletinCategory {
  id: string;
  name: string;
  code: string;
  color?: string;
}

interface BulletinPost {
  id: string;
  title: string;
  body: string;
  category: string;
  authorId: string;
  createdAt: string;
  isPinned?: boolean;
  likesCount?: number;
  dislikesCount?: number;
  commentsCount?: number;
  viewCount?: number;
  comments?: BulletinComment[];
}

export default function BulletinHub() {
  const session = useSession();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    body: "",
    category: "general",
  });

  // Interaction states
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [creationType, setCreationType] = useState<"TOPIC" | "CONTENT">(
    "TOPIC",
  );
  const [categories, setCategories] = useState<BulletinCategory[]>([]);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    code: "",
    color: "#6366f1",
  });
  const [channelSearch, setChannelSearch] = useState("");

  const openCreate = (type: "TOPIC" | "CONTENT") => {
    setCreationType(type);
    setIsCreateOpen(true);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/comms/bulletin-categories", {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      const data = await response.json();
      setCategories(data || []);
      if (data.length > 0 && !newPost.category) {
        setNewPost((p) => ({ ...p, category: data[0].code }));
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, [session.token, session.tenantId, newPost.category]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/comms/bulletin", {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      const data = await response.json();
      setPosts(data.data || []);
    } catch (error) {
      console.error("Failed to fetch bulletins:", error);
    } finally {
      setLoading(false);
    }
  }, [session.token, session.tenantId]);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [fetchPosts, fetchCategories]);

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.body) {
      toast({
        title: "Incomplete",
        description: "Title and body are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/comms/bulletin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
        body: JSON.stringify(newPost),
      });

      if (response.ok) {
        setIsCreateOpen(false);
        setNewPost({
          title: "",
          body: "",
          category: categories[0]?.code || "general",
        });
        toast({
          title: "Success",
          description: "Successfully posted to the board.",
        });
        await fetchPosts();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish.",
        variant: "destructive",
      });
    }
  };

  const handleReact = async (postId: string, type: "LIKE" | "DISLIKE") => {
    setIsActionLoading(`${postId}-${type}`);
    try {
      const response = await fetch(`/api/comms/bulletin/${postId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await fetchPosts();
        if (selectedPost) handleViewDetail(selectedPost);
        toast({ title: "Success", description: "Reaction updated." });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Action failed.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;
    setIsActionLoading(`comment-${postId}`);
    try {
      const response = await fetch(`/api/comms/bulletin/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
        body: JSON.stringify({ body: newComment }),
      });

      if (response.ok) {
        setNewComment("");
        setCommentingOn(null);
        await fetchPosts();
        if (selectedPost) handleViewDetail(selectedPost);
        toast({
          title: "Comment Posted",
          description: "Your feedback was added.",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to comment.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.code) return;
    try {
      const response = await fetch("/api/comms/bulletin-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
        body: JSON.stringify(newCategory),
      });
      if (response.ok) {
        setNewCategory({ name: "", code: "", color: "#6366f1" });
        fetchCategories();
        toast({ title: "Category Created" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? This will remove the channel group.")) return;
    try {
      await fetch(`/api/comms/bulletin-categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      fetchCategories();
      toast({ title: "Category Removed" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewDetail = async (post: BulletinPost) => {
    try {
      const response = await fetch(`/api/comms/bulletin/${post.id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
          "x-tenant-id": session.tenantId,
        },
      });
      const data = await response.json();
      setSelectedPost(data);
    } catch (error) {
      console.error("Failed to fetch detail:", error);
      setSelectedPost(post);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title?.toLowerCase().includes(filter.toLowerCase()) ||
      post.body?.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-6">
        <PageHeader
          title="Bulletin Board"
          subtitle="Stay informed with the latest announcements and discussions."
          primaryAction={
            <div className="flex gap-3">
              <Button
                onClick={() => openCreate("TOPIC")}
                variant="outline"
                className="border-primary/20 hover:bg-primary/5 shadow-sm transition-all active:scale-95 px-6 font-black uppercase tracking-widest text-[10px] h-12"
              >
                <Plus className="h-3 w-3 mr-2" /> New Topic
              </Button>
              <Button
                onClick={() => openCreate("CONTENT")}
                className="bg-primary hover:bg-primary/90 shadow-lg transition-all active:scale-95 px-6 font-black uppercase tracking-widest text-[10px] h-12"
              >
                <Send className="h-3 w-3 mr-2" /> Post Content
              </Button>
            </div>
          }
        />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              className="pl-10 h-12 bg-card border-none shadow-sm focus-visible:ring-1 text-sm font-bold"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button
            onClick={() => openCreate("TOPIC")}
            className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Topic
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {loading && posts.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-[2rem] border bg-muted/40 animate-pulse"
                />
              ))
            ) : filteredPosts.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed rounded-[3rem] opacity-40 bg-muted/20">
                <Megaphone className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-xl font-black uppercase tracking-widest">
                  Board Silence
                </h3>
                <p className="text-xs font-bold leading-relaxed italic mb-6">
                  No active topics found matching your criteria.
                </p>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  variant="outline"
                  className="rounded-xl font-black uppercase tracking-widest text-[10px]"
                >
                  Ignite New Conversation
                </Button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 overflow-hidden group hover:-translate-y-1 transition-all rounded-[2.5rem]"
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {post.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-primary fill-primary" />
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-black tracking-[0.2em] border-primary/20 bg-primary/5 text-primary rounded-lg uppercase"
                          >
                            {post.category}
                          </Badge>
                        </div>
                        <CardTitle
                          className="text-2xl font-black tracking-tighter cursor-pointer hover:text-primary transition-colors leading-tight"
                          onClick={() => handleViewDetail(post)}
                        >
                          {post.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono bg-muted/30 border-none rounded-lg"
                        >
                          {new Date(post.createdAt).toLocaleDateString()}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors rounded-xl opacity-0 group-hover:opacity-100"
                              onClick={() => {
                                if (confirm("Archive this topic?")) {
                                  fetch(`/api/comms/bulletin/${post.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      Authorization: `Bearer ${session.token}`,
                                      "x-tenant-id": session.tenantId,
                                    },
                                  }).then(() => fetchPosts());
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Archive Discussion</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p
                      className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 font-medium cursor-pointer"
                      onClick={() => handleViewDetail(post)}
                    >
                      {post.body}
                    </p>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 dark:bg-slate-900/20 px-8 py-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                          @{post.authorId.split("-")[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="text-[10px] font-bold">
                          {post.viewCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-10 px-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${isActionLoading?.startsWith(`${post.id}-LIKE`) ? "opacity-50" : ""}`}
                            onClick={() => handleReact(post.id, "LIKE")}
                            disabled={!!isActionLoading}
                          >
                            {isActionLoading === `${post.id}-LIKE` ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <ThumbsUp className="h-4 w-4 mr-2 text-primary" />
                            )}
                            {post.likesCount || 0}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upvote Topic</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-10 px-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${isActionLoading?.startsWith(`${post.id}-DISLIKE`) ? "opacity-50" : ""}`}
                            onClick={() => handleReact(post.id, "DISLIKE")}
                            disabled={!!isActionLoading}
                          >
                            {isActionLoading === `${post.id}-DISLIKE` ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <ThumbsDown className="h-4 w-4 mr-2 text-rose-500" />
                            )}
                            {post.dislikesCount || 0}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Downvote Topic</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl"
                            onClick={() =>
                              setCommentingOn(
                                commentingOn === post.id ? null : post.id,
                              )
                            }
                          >
                            <MessageSquare className="h-4 w-4 mr-2 text-indigo-500" />
                            {post.commentsCount || 0}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Contribute Feedback</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardFooter>

                  {commentingOn === post.id && (
                    <div className="p-6 bg-muted/10 border-t animate-in slide-in-from-top duration-300">
                      <div className="flex gap-4">
                        <Textarea
                          placeholder="Your professional perspective..."
                          className="min-h-[100px] text-xs font-bold bg-white dark:bg-slate-950 resize-none rounded-2xl border-none shadow-inner"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button
                          className="h-auto w-16 rounded-2xl bg-primary shadow-lg shadow-primary/20"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment.trim() || !!isActionLoading}
                        >
                          {isActionLoading === `comment-${post.id}` ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          <div className="space-y-8">
            <WorkspacePanel
              title="Channels"
              className="p-8 border-none shadow-2xl rounded-[2.5rem]"
            >
              <div className="space-y-4">
                <Button
                  onClick={() => setIsCategoryManageOpen(true)}
                  className="w-full h-11 rounded-xl bg-primary/10 text-primary border-primary/20 border hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] mb-2 shadow-none transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Channel
                </Button>

                <div
                  onClick={() => setActiveCategory("all")}
                  className={`flex justify-between items-center group cursor-pointer hover:translate-x-1 transition-all p-3 rounded-xl ${activeCategory === "all" ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <Filter
                      className={`h-4 w-4 ${activeCategory === "all" ? "text-primary" : "text-slate-400"}`}
                    />
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${activeCategory === "all" ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      All Channels
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-black border-none px-2 h-5 rounded-md ${activeCategory === "all" ? "bg-primary text-white" : "bg-muted/30"}`}
                  >
                    {posts.length}
                  </Badge>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search channels..."
                    className="h-10 pl-9 rounded-xl border-none bg-slate-100 dark:bg-slate-800 text-[10px] font-bold"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                  />
                </div>

                {categories.length === 0 ? (
                  <div className="py-6 text-center opacity-40 border-2 border-dashed rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      No Channels
                    </p>
                  </div>
                ) : (
                  categories
                    .filter((cat) =>
                      cat.name
                        .toLowerCase()
                        .includes(channelSearch.toLowerCase()),
                    )
                    .map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.code)}
                        className={`flex justify-between items-center group cursor-pointer hover:translate-x-1 transition-all p-3 rounded-xl ${activeCategory === cat.code ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="h-2 w-2 rounded-full transition-all"
                            style={{ backgroundColor: cat.color || "#6366f1" }}
                          />
                          <span
                            className={`text-xs font-black uppercase tracking-widest ${activeCategory === cat.code ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            {cat.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black border-none px-2 h-5 rounded-md ${activeCategory === cat.code ? "bg-primary text-white" : "bg-muted/30"}`}
                        >
                          {posts.filter((p) => p.category === cat.code).length}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </WorkspacePanel>

            <Card className="bg-primary/5 border-primary/20 shadow-none p-4 rounded-[2rem]">
              <CardHeader className="pb-4 pt-2">
                <CardTitle className="text-[10px] flex items-center font-black uppercase tracking-[0.3em] text-primary">
                  <AlertCircle className="h-4 w-4 mr-3" />
                  GUIDELINES
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground space-y-4 leading-relaxed font-bold">
                <div className="flex gap-4">
                  <Badge
                    variant="outline"
                    className="h-5 w-5 p-0 rounded-lg bg-primary/20 text-primary text-[9px] flex items-center justify-center shrink-0 border-none"
                  >
                    01
                  </Badge>
                  <span>Post helpful content for your colleagues.</span>
                </div>
                <div className="flex gap-4">
                  <Badge
                    variant="outline"
                    className="h-5 w-5 p-0 rounded-lg bg-primary/20 text-primary text-[9px] flex items-center justify-center shrink-0 border-none"
                  >
                    02
                  </Badge>
                  <span>Be respectful and professional in comments.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* View Detail Dialog */}
        <Dialog
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
        >
          <DialogContent className="sm:max-w-3xl border-none shadow-3xl bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-[3rem]">
            {selectedPost && (
              <div className="flex flex-col h-[80vh] bg-white dark:bg-slate-900">
                <div className="p-10 border-b flex justify-between items-start bg-slate-50/50 dark:bg-slate-950/20 sticky top-0 z-10">
                  <div className="space-y-4">
                    <Badge className="bg-primary/10 text-primary border-none font-black tracking-widest text-[10px] uppercase">
                      {categories.find((c) => c.code === selectedPost.category)
                        ?.name || selectedPost.category}
                    </Badge>
                    <h2 className="text-4xl font-black tracking-tighter leading-none">
                      {selectedPost.title}
                    </h2>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-black uppercase tracking-widest">
                            @{selectedPost.authorId.split("-")[0]}
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">
                            Authoritative Entry
                          </div>
                        </div>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest">
                          TRANSMITTED
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground">
                          {new Date(selectedPost.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-12 scrollbar-hide">
                  <div className="text-base text-slate-700 dark:text-slate-300 leading-[2] font-medium whitespace-pre-wrap tracking-tight">
                    {selectedPost.body}
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-100 italic font-bold text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4" /> {selectedPost.likesCount}{" "}
                      UPVOTES
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4" />{" "}
                      {selectedPost.dislikesCount} DOWNVOTES
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />{" "}
                      {selectedPost.commentsCount} FEEDBACKS
                    </div>
                  </div>

                  <div className="space-y-8 pb-12">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center">
                      <ChevronRight className="h-4 w-4 mr-2" /> Comments
                    </h4>
                    {selectedPost.comments?.length > 0 ? (
                      <div className="space-y-6">
                        {selectedPost.comments.map((comment: BulletinComment) => (
                          <div
                            key={comment.id}
                            className="flex gap-5 animate-in slide-in-from-left duration-500"
                          >
                            <div className="h-10 w-10 shrink-0 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xs">
                              {comment.authorId[0].toUpperCase()}
                            </div>
                            <div className="space-y-2 flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                  @{comment.authorId.split("-")[0]}
                                </span>
                                <span className="text-[9px] font-bold text-muted-foreground opacity-40">
                                  {new Date(
                                    comment.createdAt,
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 text-sm font-medium leading-relaxed border border-slate-100 dark:border-slate-800">
                                {comment.body}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center opacity-20 italic text-xs font-bold">
                        No entries in the ledger for this topic.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 border-t bg-slate-50/50 backdrop-blur-xl">
                  <div className="flex gap-4">
                    <Textarea
                      placeholder="Write a comment..."
                      className="h-14 min-h-[56px] bg-white dark:bg-slate-950 rounded-2xl border-none shadow-sm font-bold text-sm px-6 py-4"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      className="h-14 px-8 rounded-2xl bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                      onClick={() => handleAddComment(selectedPost.id)}
                      disabled={!newComment.trim() || !!isActionLoading}
                    >
                      {isActionLoading === `comment-${selectedPost.id}` ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-xl border-none shadow-3xl bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-[3rem]">
            <DialogHeader className="p-10 bg-white dark:bg-slate-900 border-b">
              <div className="flex flex-col gap-4">
                <DialogTitle className="text-3xl font-black tracking-tighter">
                  {creationType === "TOPIC"
                    ? "Start Conversation"
                    : "Post Announcement"}
                </DialogTitle>
                <div className="flex bg-muted p-1 rounded-xl w-fit">
                  <Button
                    variant={creationType === "TOPIC" ? "secondary" : "ghost"}
                    size="sm"
                    className="text-[10px] font-black h-8 px-3 rounded-lg"
                    onClick={() => setCreationType("TOPIC")}
                  >
                    TOPIC
                  </Button>
                  <Button
                    variant={creationType === "CONTENT" ? "secondary" : "ghost"}
                    size="sm"
                    className="text-[10px] font-black h-8 px-3 rounded-lg"
                    onClick={() => setCreationType("CONTENT")}
                  >
                    CONTENT
                  </Button>
                </div>
              </div>
              <div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60 mt-4">
                Communication Hub
              </div>
            </DialogHeader>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  Headline
                </label>
                <Input
                  placeholder="Subject of your post"
                  className="h-14 text-lg font-black bg-white dark:bg-slate-900 border-none shadow-inner rounded-2xl px-6 focus-visible:ring-1 focus-visible:ring-primary/20"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  Channel
                </label>
                <select
                  className="h-14 px-6 rounded-2xl border-none bg-white dark:bg-slate-900 text-sm font-black focus:ring-1 focus:ring-primary/20 outline-none shadow-sm"
                  value={newPost.category}
                  onChange={(e) =>
                    setNewPost({ ...newPost, category: e.target.value })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  Message
                </label>
                <Textarea
                  placeholder="Share details here..."
                  className="min-h-[180px] bg-white dark:bg-slate-900 border-none rounded-[2rem] font-bold leading-relaxed p-8 shadow-inner"
                  value={newPost.body}
                  onChange={(e) =>
                    setNewPost({ ...newPost, body: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  className="flex-[2] h-14 rounded-[1.25rem] bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-900/40 font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                  Post Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Category Manage Dialog */}
        <Dialog
          open={isCategoryManageOpen}
          onOpenChange={setIsCategoryManageOpen}
        >
          <DialogContent className="sm:max-w-md border-none shadow-3xl bg-slate-50 dark:bg-slate-950 p-0 overflow-hidden rounded-[2.5rem]">
            <DialogHeader className="p-8 bg-white dark:bg-slate-900 border-b">
              <DialogTitle className="text-2xl font-black">
                Manage Channels
              </DialogTitle>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid gap-4">
                <Input
                  placeholder="Channel Name (e.g. IT Ops)"
                  className="rounded-xl border-none shadow-inner"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      name: e.target.value,
                      code: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
                <Button
                  onClick={handleCreateCategory}
                  className="w-full font-black uppercase tracking-widest h-12"
                >
                  Add Channel
                </Button>
              </div>

              <div className="space-y-3 pt-4 border-t">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-bold">{cat.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="h-8 w-8 text-rose-500 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
