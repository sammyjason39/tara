import { Prisma } from '@prisma/client';

export interface Ingredient {
  item_id: string;
  quantity: Prisma.Decimal;
  unit: string;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  baseCost: Prisma.Decimal;
  suggestedPrice: Prisma.Decimal;
  ingredients: Ingredient[];
  created_at: Date;
  updated_at: Date;
}

export interface IFnbRepository {
  getRecipes(tenant_id: string): Promise<Recipe[]>;
  getRecipeById(tenant_id: string, id: string): Promise<Recipe | null>;
  createRecipe(tenant_id: string, data: any): Promise<Recipe>;
  
  /**
   * Enterprise Hook: Recipe-to-Inventory deductive link
   * Standardized to work with external Inventory system.
   */
  deductIngredients(tenant_id: string, recipeId: string, yieldQuantity: number): Promise<void>;

  /**
   * Dynamic Costing: Calculate based on procurement/purchase data.
   */
  calculateDynamicCost(tenant_id: string, recipeId: string): Promise<Prisma.Decimal>;
}
