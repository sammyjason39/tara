import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Input } from "@/components/ui/input";
import { useSession } from "@/core/security/session";
import {
  createFile,
  listFiles,
  listRecycleBin,
  moveToRecycle,
  restoreFromRecycle,
  updateFile,
} from "@/core/tools/explorer/service";
import { exportPdf } from "@/core/tools/exportPipeline";

type Slide = {
  id: string;
  title: string;
  body: string;
};

const createSlide = (index: number): Slide => ({
  id: `slide-${index}`,
  title: `Slide ${index}`,
  body: "Add your content here...",
});

export default function PresentationTool() {
  const session = useSession();
  const [slides, setSlides] = useState<Slide[]>([createSlide(1)]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("Untitled Deck");

  const activeSlide = slides[activeIndex];

  const addSlide = () => {
    setSlides((prev) => [...prev, createSlide(prev.length + 1)]);
    setActiveIndex(slides.length);
  };

  const updateSlide = (patch: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        index === activeIndex ? { ...slide, ...patch } : slide,
      ),
    );
  };

  const removeSlide = () => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, index) => index !== activeIndex));
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Slides"
          subtitle="Build presentations with reusable decks."
          primaryAction={
            <Button
              onClick={() => {
                const content = JSON.stringify(slides);
                if (selectedId) {
                  updateFile(session.tenantId, session, selectedId, { name: title, content });
                } else {
                  const record = createFile(session.tenantId, session, {
                    name: title,
                    type: "slide",
                    content,
                  });
                  setSelectedId(record.id);
                }
                setVersion((prev) => prev + 1);
              }}
            >
              Save
            </Button>
          }
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const payload = slides.map((slide) => `${slide.title}\n${slide.body}`).join("\n\n");
                  const blob = exportPdf({
                    tenantId: session.tenantId,
                    actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
                    filename: `${title}.pdf`,
                    content: payload,
                    source: "slides",
                  });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "presentation.pdf";
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
              >
                Export PDF
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        <WorkspacePanel title="Explorer" description="Department-scoped slide decks.">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <Input
                placeholder="Search decks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="space-y-2">
                {(search ? listFiles(session.tenantId, session, "slide").filter((file) => file.name.toLowerCase().includes(search.toLowerCase())) : listFiles(session.tenantId, session, "slide")).map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                    <button
                      className="text-left text-sm font-medium text-foreground"
                      onClick={() => {
                        setSelectedId(file.id);
                        setTitle(file.name);
                        try {
                          const parsed = JSON.parse(file.content) as Slide[];
                          setSlides(parsed);
                          setActiveIndex(0);
                        } catch {
                          setSlides([createSlide(1)]);
                          setActiveIndex(0);
                        }
                      }}
                    >
                      {file.name}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        moveToRecycle(session.tenantId, session, file.id);
                        setVersion((prev) => prev + 1);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Slides: {slides.length}
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Slides" description="Organize your slide deck.">
          <div className="flex flex-wrap items-center gap-2">
            {slides.map((slide, index) => (
              <Button
                key={slide.id}
                variant={index === activeIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveIndex(index)}
              >
                {slide.title}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={addSlide}>
              Add slide
            </Button>
            <Button variant="outline" size="sm" onClick={removeSlide}>
              Remove
            </Button>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Slide editor" description="Edit title and content.">
          <div className="grid gap-4">
            <Input
              value={activeSlide.title}
              onChange={(event) => updateSlide({ title: event.target.value })}
            />
            <textarea
              className="min-h-[280px] w-full rounded-lg border bg-background p-4 text-sm"
              value={activeSlide.body}
              onChange={(event) => updateSlide({ body: event.target.value })}
            />
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Recycle bin" description="Only owners/admins can restore.">
          {listRecycleBin(session.tenantId, session, "slide").length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Recycle bin is empty.
            </div>
          ) : (
            <div className="space-y-2">
              {listRecycleBin(session.tenantId, session, "slide").map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="text-sm">{file.name}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      restoreFromRecycle(session.tenantId, session, file.id);
                      setVersion((prev) => prev + 1);
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
