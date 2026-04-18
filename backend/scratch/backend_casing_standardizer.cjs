const fs = require('fs');
const path = require('path');

const backendDir = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src';

const targets = [
  ['tenantId', 'tenant_id'],
  ['employeeId', 'employee_id'],
  ['actorId', 'actor_id'],
  ['customerId', 'customer_id'],
  ['locationId', 'location_id'],
  ['storeId', 'store_id'],
  ['shiftId', 'shift_id'],
  ['productId', 'product_id'],
  ['categoryId', 'category_id'],
  ['orderId', 'order_id'],
  ['itemId', 'item_id'],
  ['transactionId', 'transaction_id'],
  ['ledgerId', 'ledger_id'],
  ['requestId', 'request_id'],
  ['auditId', 'audit_id'],
  ['branchId', 'branch_id'],
  ['deviceId', 'device_id'],
  ['cameraId', 'camera_id'],
  ['sensorId', 'sensor_id'],
  ['terminalId', 'terminal_id'],
  ['shipmentId', 'shipment_id'],
  ['voucherId', 'voucher_id'],
  ['discountAmount', 'discount_amount'],
  ['grandTotal', 'grand_total'],
  ['totalAmount', 'total_amount'],
  ['unitPrice', 'unit_price'],
  ['taxAmount', 'tax_amount'],
  ['paymentMethod', 'payment_method'],
  ['paymentStatus', 'payment_status'],
  ['startTime', 'start_time'],
  ['endTime', 'end_time'],
  ['openingCash', 'opening_cash'],
  ['closingCash', 'closing_cash'],
  ['expectedCash', 'expected_cash'],
  ['basePrice', 'base_price'],
  ['reservationExpiresAt', 'reservation_expires_at'],
  ['taxTotal', 'tax_total'],
  ['discountTotal', 'discount_total'],
  ['subTotal', 'subtotal']
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === 'dist') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk(backendDir, (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  targets.forEach(([camel, snake]) => {
    // Systematic replacement but avoid library-specific strings if possible
    // Using word boundaries to be safe
    const regex = new RegExp(`\\b${camel}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, snake);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Refactored: ${filePath}`);
  }
});
