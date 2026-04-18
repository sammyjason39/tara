import { Prisma } from '@prisma/client';

export interface RecipeIngredient {
  item_id: string;
  quantity: Prisma.Decimal;
  unit: string;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  baseCost: Prisma.Decimal;
  suggestedPrice: Prisma.Decimal;
  created_at: Date;
  updated_at: Date;
}

export abstract class FnbRepository {
  abstract getRecipes(tenant_id: string): Promise<Recipe[]>;
  abstract getRecipeById(tenant_id: string, id: string): Promise<Recipe | null>;
  abstract createRecipe(tenant_id: string, data: any): Promise<Recipe>;
  
  /**
   * Enterprise Hook: Recipe-to-Inventory deductive link
   * Deducts ingredients from Inventory when a recipe is sold/produced.
   */
  abstract deductIngredientsFromInventory(tenant_id: string, recipeId: string, yieldQuantity: number): Promise<void>;
}
