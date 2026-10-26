import type {ScaleReading} from '../data/scale-protocol';
export type ScaleDevice={id:string;name:string;rssi:number|null};
export async function scanScales(_onDevice:(device:ScaleDevice)=>void,_onStatus:(message:string)=>void):Promise<()=>void>{throw new Error('Bluetooth scale scanning is available in the installed iOS or Android app.');}
export async function connectScale(_id:string,_onReading:(reading:ScaleReading)=>void,_onStatus:(message:string)=>void):Promise<()=>void>{throw new Error('Connect the scale from the installed iOS or Android app.');}
