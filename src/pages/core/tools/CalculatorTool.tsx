import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const standardKeys = [
  "7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"
];

const scientificKeys = [
  "sin", "cos", "tan", "log", "ln", "sqrt", "^", "pi", "e", "(", ")", "C", "DEL"
];

const safeEval = (expression: string) => {
  const normalized = expression
    .replace(/pi/g, "Math.PI")
    .replace(/\be\b/g, "Math.E")
    .replace(/sin/g, "Math.sin")
    .replace(/cos/g, "Math.cos")
    .replace(/tan/g, "Math.tan")
    .replace(/log/g, "Math.log10")
    .replace(/ln/g, "Math.log")
    .replace(/sqrt/g, "Math.sqrt")
    .replace(/\^/g, "**");
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${normalized});`)();
};

export default function CalculatorTool() {
  const [display, setDisplay] = useState("0");
  const [mode, setMode] = useState<"standard" | "scientific">("standard");

  const append = (value: string) => {
    setDisplay((prev) => (prev === "0" ? value : `${prev}${value}`));
  };

  const clear = () => setDisplay("0");
  const del = () => setDisplay((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));

  const evaluate = () => {
    try {
      const result = safeEval(display);
      setDisplay(String(result));
    } catch {
      setDisplay("Error");
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Calculator"
          subtitle="Standard and scientific calculator."
        />
      }
    >
      <WorkspacePanel>
        <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
          <TabsList>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="scientific">Scientific</TabsTrigger>
          </TabsList>
          <TabsContent value="standard" className="mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-right text-2xl font-semibold">
                {display}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {standardKeys.map((key) => (
                  <Button
                    key={key}
                    variant={key === "=" ? "default" : "outline"}
                    onClick={() => {
                      if (key === "=") evaluate();
                      else append(key);
                    }}
                  >
                    {key}
                  </Button>
                ))}
                <Button variant="outline" onClick={clear}>
                  C
                </Button>
                <Button variant="outline" onClick={del}>
                  DEL
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="scientific" className="mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 text-right text-2xl font-semibold">
                {display}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {scientificKeys.map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => {
                      if (key === "C") clear();
                      else if (key === "DEL") del();
                      else if (key === "^") append("^");
                      else if (key === "pi") append("pi");
                      else if (key === "e") append("e");
                      else append(`${key}(`);
                    }}
                  >
                    {key}
                  </Button>
                ))}
                <Button onClick={evaluate}>=</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>
    </PageShell>
  );
}
