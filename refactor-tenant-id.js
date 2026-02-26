const fs = require("fs");
const path = require("path");

function walk(dir, regexes, replaceWiths, extensions) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (
        !fullPath.includes("node_modules") &&
        !fullPath.includes(".git") &&
        !fullPath.includes("dist") &&
        !fullPath.includes("generated")
      ) {
        walk(fullPath, regexes, replaceWiths, extensions);
      }
    } else {
      if (extensions.some((ext) => fullPath.endsWith(ext))) {
        let content = fs.readFileSync(fullPath, "utf8");
        let original = content;
        for (let i = 0; i < regexes.length; i++) {
          content = content.replace(regexes[i], replaceWiths[i]);
        }
        if (content !== original) {
          fs.writeFileSync(fullPath, content, "utf8");
          console.log("Updated: " + fullPath);
        }
      }
    }
  }
}

const rootDir = process.cwd();
const extList = [".ts", ".tsx", ".prisma"];
const regexes = [/\bcompanyId\b/g, /\bcompany_id\b/g];
const replaceWiths = ["tenantId", "tenant_id"];

walk(path.join(rootDir, "prisma"), regexes, replaceWiths, [".prisma"]);
walk(path.join(rootDir, "backend", "src"), regexes, replaceWiths, [
  ".ts",
  ".tsx",
]);
walk(path.join(rootDir, "src"), regexes, replaceWiths, [".ts", ".tsx"]);

console.log("Refactoring complete.");
