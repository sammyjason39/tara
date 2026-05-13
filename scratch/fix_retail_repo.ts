import * as fs from 'fs';
import * as path from 'path';

const filePath = 'backend/src/modules/retail/repositories/retail.db.repository.ts';
const fullPath = path.resolve(process.cwd(), filePath);
let content = fs.readFileSync(fullPath, 'utf8');

const target = `        if (
          !finalLocationId ||
          finalLocationId === "loc-default" ||
          finalLocationId === "placeholder"
        ) {
          const newLocation = await tx.locations.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true, excludeEcommerce: true }),
              name: data.name,
              code: data.code,
              address: data.address || "Main Street",
              type: "branch",
              latitude: data.latitude,
              longitude: data.longitude,
              geofence_radius: data.geofenceRadius || 200,
              country: data.country,
              currency: data.currency,
            },
          });
          finalLocationId = newLocation.id;
        }`;

const replacement = `        // If location_id is a placeholder or missing, try to find an existing location with the same code or name
        if (
          !finalLocationId ||
          finalLocationId === "loc-default" ||
          finalLocationId === "placeholder"
        ) {
          const existingLoc = await tx.locations.findFirst({
            where: {
              tenant_id: ctx.tenant_id,
              OR: [
                { code: data.code },
                { name: data.name }
              ],
              deleted_at: null
            }
          });

          if (existingLoc) {
            finalLocationId = existingLoc.id;
          } else {
            const newLocation = await tx.locations.create({
              data: {
                id: uuidv4(),
                updated_at: new Date(),
                ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true, excludeEcommerce: true }),
                name: data.name,
                code: data.code,
                address: data.address || "Main Street",
                type: "branch",
                latitude: data.latitude,
                longitude: data.longitude,
                geofence_radius: data.geofenceRadius || 200,
                country: data.country,
                currency: data.currency,
              },
            });
            finalLocationId = newLocation.id;
          }
        }`;

// We'll use a more flexible regex or just line-by-line matching if needed.
// But first let's see if we can find it.
if (content.includes(target)) {
    console.log("Found target!");
    content = content.replace(target, replacement);
    fs.writeFileSync(fullPath, content);
} else {
    console.log("Target NOT found. Checking for variations...");
    // Try without the comment if we included it in the regex before
    // Actually, I'll just look for a unique part of it.
    const uniquePart = 'const newLocation = await tx.locations.create({';
    if (content.includes(uniquePart)) {
        console.log("Found unique part!");
        // I'll be more aggressive with the regex
        const regex = /if\s*\(\s*!finalLocationId\s*\|\|\s*finalLocationId\s*===\s*"loc-default"\s*\|\|\s*finalLocationId\s*===\s*"placeholder"\s*\)\s*\{[\s\S]*?finalLocationId\s*=\s*newLocation\.id;\s*\}/;
        if (regex.test(content)) {
            console.log("Regex matched!");
            content = content.replace(regex, replacement);
            fs.writeFileSync(fullPath, content);
        } else {
            console.log("Regex FAILED.");
        }
    }
}
