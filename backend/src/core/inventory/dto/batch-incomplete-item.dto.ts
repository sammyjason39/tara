import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class BatchIncompleteItemDto {
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class BatchIncompleteItemsRequestDto {
  @IsArray()
  @IsNotEmpty()
  items: BatchIncompleteItemDto[];
}

export class BatchIncompleteItemsResponseDto {
  success: boolean;
  data: {
    id: string;
    sku: string;
    name: string;
    barcode: string;
    category_id: string;
    is_anomaly: boolean;
    status: "incomplete";
    created_at: string;
  }[];
}
