const fs = require('fs');
const path = require('path');

const filePath = 'backend/src/modules/retail/repositories/retail.db.repository.ts';
const fullPath = path.resolve(process.cwd(), filePath);
let content = fs.readFileSync(fullPath, 'utf8');

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

const regex = /if\s*\(\s*!finalLocationId\s*\|\|\s*finalLocationId\s*===\s*"loc-default"\s*\|\|\s*finalLocationId\s*===\s*"placeholder"\s*\)\s*\{[\s\S]*?finalLocationId\s*=\s*newLocation\.id;\s*\}/;

if (regex.test(content)) {
    console.log("Regex matched!");
    content = content.replace(regex, replacement);
    fs.writeFileSync(fullPath, content);
    console.log("File updated successfully.");
} else {
    console.log("Regex FAILED. Checking for unique part...");
    const uniquePart = 'const newLocation = await tx.locations.create({';
    if (content.includes(uniquePart)) {
        console.log("Unique part found, but regex failed. Dumping content around it:");
        const index = content.indexOf(uniquePart);
        console.log(content.substring(index - 100, index + 200));
    } else {
        console.log("Unique part NOT found.");
    }
}
