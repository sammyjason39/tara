# Missing Features - Inventory Department

## 1. Advanced Costing (FIFO/LIFO)
- **Status**: Database support exists (`cost_layers`), but Service logic for FIFO automated consumption is only partially implemented (Defaults to Average Cost).
- **Impact**: Inaccurate margins for high-volatility commodities.

## 2. Low-Stock Automated Actions
- **Status**: Alerts are generated, but no "Auto-Requisition" logic exists.
- **Impact**: Manual intervention required for every restock.

## 3. Physical Audit (Mobile Interface)
- **Status**: Audit cycle API exists, but no "Barcode Scanning" batch-processing endpoint for high-speed audits.
- **Impact**: Slow physical stock counts; limited to manual data entry.

## 4. Multi-UOM Conversion
- **Status**: Items have `uom` (String), but no conversion table (e.g. 1 Box = 24 Units).
- **Impact**: Difficult to manage items purchased in bulk but sold in units.
