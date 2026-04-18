export class Device {
  id: string;
  tenant_id: string;
  name: string;
  type: string; // RFID_READER, BARCODE_SCANNER, POS_TERMINAL
  connection: string; // API, LAN, USB, MQTT
  status: string; // ONLINE, OFFLINE
  location_id?: string;
  owner_id?: string;
  metadata?: any;
  created_at: Date;
}

export class DeviceEvent {
  id: string;
  tenant_id: string;
  device_id: string;
  event_type: string; // RFID_SCAN, BARCODE_SCAN, TEMP_ALERT
  payload: any;
  processed: boolean;
  created_at: Date;
}
