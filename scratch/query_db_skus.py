import prisma
from prisma import Prisma

async def main():
    db_local = Prisma()
    await db_local.connect()
    
    # Target SKUs from image
    skus = [
        '585 557R', '585 557G', '585 558F', '585 558E', '585 555G',
        '580 209C', '580.209C', '585 209C', '538 016', '538 557R',
        '585 561B', '585 561EE', '585 561AB', '585 561EC', '585 561A', '585 561EA', '585 561', '585 561D',
        '535 401', '535 402', '535 402A', '535 403', '535 403A'
    ]
    
    print("--- Searching SKUs in Local DB ---")
    for sku in skus:
        item = await db_local.item_masters.find_first(
            where={'sku': sku}
        )
        if item:
            print(f"Local DB match: SKU='{sku}' | Name='{item.name}' | Price={item.selling_price}")

    await db_local.disconnect()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
