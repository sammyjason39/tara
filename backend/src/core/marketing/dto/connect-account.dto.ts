import { IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConnectAccountDto {
  @IsString()
  @IsIn(['meta', 'google'])
  provider: 'meta' | 'google';

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsArray()
  scopes: string[];
}

