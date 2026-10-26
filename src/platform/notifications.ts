import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export async function requestNotificationPermission(){if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('rest',{name:'Rest timer',importance:4,sound:'default',vibrationPattern:[0,200,100,200]});const result=await Notifications.requestPermissionsAsync({ios:{allowAlert:true,allowSound:true,allowBadge:false}});return result.granted;}
let queue=Promise.resolve();
export function syncRestNotification(endsAt:number|null){queue=queue.catch(()=>{}).then(async()=>{await Notifications.cancelScheduledNotificationAsync('workout-rest');if(!endsAt||endsAt<=Date.now())return;const permission=await Notifications.getPermissionsAsync();if(!permission.granted)return;await Notifications.scheduleNotificationAsync({identifier:'workout-rest',content:{title:'Ready for your next set',body:'Your rest timer is complete.',sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(endsAt),...(Platform.OS==='android'?{channelId:'rest'}:{})}});});return queue;}

let reminderQueue=Promise.resolve();
export function syncTrainingReminders(days:number[],hour:number,minute:number,enabled:boolean){
 reminderQueue=reminderQueue.catch(()=>{}).then(async()=>{
  for(let day=0;day<7;day++)await Notifications.cancelScheduledNotificationAsync(`workout-training-${day}`);
  if(!enabled)return;const permission=await Notifications.getPermissionsAsync();if(!permission.granted)return;
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('training',{name:'Training reminders',importance:3,sound:'default'});
  for(const day of new Set(days))await Notifications.scheduleNotificationAsync({identifier:`workout-training-${day}`,content:{title:'A little time for you',body:'Your planned training day is here. Start your routine, or adjust it to fit today.',sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.WEEKLY,weekday:day+1,hour,minute,...(Platform.OS==='android'?{channelId:'training'}:{})}});
 });return reminderQueue;
}
