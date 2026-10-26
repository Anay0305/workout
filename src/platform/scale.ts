import { PermissionsAndroid, Platform } from 'react-native';
import { toByteArray } from 'base64-js';
import { decodeWeightMeasurement, type ScaleReading } from '../data/scale-protocol';
import { waitForBluetooth } from './bluetooth-state';
export type ScaleDevice={id:string;name:string;rssi:number|null};
let manager:import('@sfourdrinier/react-native-ble-plx').BleManager|null=null;
async function getManager(){if(!manager){const ble=await import('@sfourdrinier/react-native-ble-plx');manager=new ble.BleManager();}return manager;}
async function permission(){if(Platform.OS!=='android')return;const permissions=Number(Platform.Version)>=31?[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]:[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];const result=await PermissionsAndroid.requestMultiple(permissions);if(permissions.some(p=>result[p]!==PermissionsAndroid.RESULTS.GRANTED))throw new Error('Bluetooth scan and connection permissions are required.');}
export async function scanScales(onDevice:(device:ScaleDevice)=>void,onStatus:(message:string)=>void):Promise<()=>void>{
 await permission();const ble=await getManager();onStatus('Waiting for Bluetooth. Allow access if your phone asks.');await waitForBluetooth(ble);
 onStatus('Scanning nearby Bluetooth devices for 15 seconds…');let active=true;let timeout:ReturnType<typeof setTimeout>|undefined;
 const stop=()=>{active=false;clearTimeout(timeout);void ble.stopDeviceScan().catch(()=>{});};
 try{await ble.startDeviceScan(null,{allowDuplicates:false},(error,device)=>{if(!active)return;if(error){stop();onStatus(error.message);return;}if(device)onDevice({id:device.id,name:device.localName??device.name??'Unnamed Bluetooth device',rssi:device.rssi});});
 if(active)timeout=setTimeout(()=>{stop();onStatus('Scan complete. Choose your scale by its name.');},15000);
 return stop;}catch(error){stop();throw error;}
}
export async function connectScale(id:string,onReading:(reading:ScaleReading)=>void,onStatus:(message:string)=>void):Promise<()=>void>{const ble=await getManager();await ble.stopDeviceScan();await waitForBluetooth(ble);onStatus('Connecting and checking supported services…');let device:import('@sfourdrinier/react-native-ble-plx').Device;try{device=await ble.connectToDevice(id,{timeout:15000});await device.discoverAllServicesAndCharacteristics();
 const services=await device.services();const service=services.find(s=>s.uuid.toLowerCase()==='0000181d-0000-1000-8000-00805f9b34fb');if(!service){await ble.cancelDeviceConnection(id).catch(()=>{});throw new Error('This device does not expose the standard Bluetooth weight service. The scale may use a private protocol; enter the measurement manually. No data was saved.');}
 const chars=await device.characteristicsForService(service.uuid);const weight=chars.find(c=>c.uuid.toLowerCase()==='00002a9d-0000-1000-8000-00805f9b34fb');if(!weight||(!weight.isNotifiable&&!weight.isIndicatable)){await ble.cancelDeviceConnection(id).catch(()=>{});throw new Error('This scale does not provide standard weight notifications. No data was saved.');}
 onStatus('Connected. Step on the scale and wait for a stable reading.');const sub=device.monitorCharacteristicForService(service.uuid,weight.uuid,(error,char)=>{if(error){onStatus('Scale disconnected. Reconnect to try again.');return;}if(!char?.value)return;try{const reading=decodeWeightMeasurement(toByteArray(char.value));if(reading){onReading(reading);onStatus('Reading received. Confirm it belongs to you before saving.');}}catch{onStatus('The scale sent a reading that could not be decoded.');}});return()=>{sub.remove();void ble.cancelDeviceConnection(id).catch(()=>{});};}catch(e){await ble.cancelDeviceConnection(id).catch(()=>{});throw e;}}
