import { cafeModule } from "./fnb";
import { retailModule } from "./retail";
import { registerModule } from "@/core/runtime/moduleRegistry";

/**
 * Industry Module Bundle
 * 
 * This file centralizes all industry-specific modules and handles 
 * their registration into the core runtime.
 */
export function registerIndustryModules(): void {
  registerModule(cafeModule);
  registerModule(retailModule);
}
