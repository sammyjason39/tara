const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const replacements = [
    { from: /\bentityId\b/g, to: 'entity_id' },
    { from: /\bentityType\b/g, to: 'entity_type' },
    { from: /\bipAddress\b/g, to: 'ip_address' },
    { from: /\buserAgent\b/g, to: 'user_agent' },
    { from: /\bidempotencyKey\b/g, to: 'idempotency_key' },
    { from: /\bcorrelationId\b/g, to: 'correlation_id' },
    { from: /\beventReferenceId\b/g, to: 'event_reference_id' },
    { from: /\bprocessingStartedAt\b/g, to: 'processing_started_at' },
    { from: /\bsourceModule\b/g, to: 'source_module' },
    { from: /\beventType\b/g, to: 'event_type' },
    { from: /\baggregateId\b/g, to: 'aggregate_id' },
    { from: /\brequestedBy\b/g, to: 'requested_by' },
    { from: /\bmakerDept\b/g, to: 'maker_dept' },
    { from: /\bdestinationDept\b/g, to: 'destination_dept' },
    { from: /\bbeforeState\b/g, to: 'before_state' },
    { from: /\bafterState\b/g, to: 'after_state' },
    { from: /\bstartDate\b/g, to: 'start_date' },
    { from: /\bendDate\b/g, to: 'end_date' },
    { from: /\bownerId\b/g, to: 'owner_id' },
    { from: /\bownerName\b/g, to: 'owner_name' },
    { from: /\bchannelMix\b/g, to: 'channel_mix' },
    { from: /\bleadId\b/g, to: 'lead_id' },
    { from: /\baccountName\b/g, to: 'account_name' },
    { from: /\bexpectedCloseDate\b/g, to: 'expected_close_date' },
    { from: /\bcompanyName\b/g, to: 'company_name' },
    { from: /\bcontactName\b/g, to: 'contact_name' },
    { from: /\bcontactEmail\b/g, to: 'contact_email' },
    { from: /\bpotentialValue\b/g, to: 'potential_value' },
    { from: /\bslaDueAt\b/g, to: 'sla_due_at' },
    // PaymentProvider fixes
    { from: /\bmaxAmountPerTxn\b/g, to: 'max_amount_per_txn' },
    { from: /\bsettlementSlaHours\b/g, to: 'settlement_sla_hours' }
];

console.log('Starting mass standardization V6 (Absolute Final Backend Hardening)...');

const files = walk(baseDir);
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    replacements.forEach(rep => {
        if (rep.from.test(content)) {
            content = content.replace(rep.from, rep.to);
            changed = true;
        }
    });

    if (changed) {
        console.log(`Updated: ${file}`);
        fs.writeFileSync(file, content);
    }
});

console.log('Mass standardization V6 complete.');
