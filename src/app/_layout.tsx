import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from '../ThemeProvider';
import { TrainingProvider, useTraining } from '../data/store';
import { syncRestNotification, syncTrainingReminders } from '../platform/notifications';
import { JournalRecovery } from '../components/JournalRecovery';
export default function Layout(){return <SafeAreaProvider><ThemeProvider><TrainingProvider><AppNavigator /></TrainingProvider></ThemeProvider></SafeAreaProvider>;}
function AppNavigator(){
 const {theme:t,loaded}=useAppTheme();const {state,ready,error,saving,loadFailed,retry}=useTraining();const segments=useSegments();
 useEffect(()=>{if(ready&&!loadFailed&&loaded&&!state.profile.completedOnboarding&&segments[0]!=='onboarding')router.replace('/onboarding');},[ready,loadFailed,loaded,state.profile.completedOnboarding,segments]);
 useEffect(()=>{if(ready&&!loadFailed)void syncRestNotification(state.settings.notifications?state.active?.restEndsAt??null:null).catch(()=>{});},[ready,loadFailed,state.settings.notifications,state.active?.restEndsAt]);
 const reminderDays=state.profile.preferredDays.join(',');
 useEffect(()=>{if(ready&&!loadFailed)void syncTrainingReminders(reminderDays?reminderDays.split(',').map(Number):[],state.settings.reminderHour??18,state.settings.reminderMinute??0,!!state.settings.reminders).catch(()=>{});},[ready,loadFailed,reminderDays,state.settings.reminderHour,state.settings.reminderMinute,state.settings.reminders]);
 if(!loaded||!ready)return <View style={{flex:1,backgroundColor:t.background,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={t.accent}/><Text style={{color:t.muted,marginTop:16}}>Opening your training journal…</Text></View>;
 if(loadFailed)return <JournalRecovery/>;
 return <View style={{flex:1,backgroundColor:t.background}}><StatusBar style={t.id==='dark'?'light':'dark'}/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:t.background},animation:'slide_from_right'}}><Stack.Screen name="(tabs)"/><Stack.Screen name="workout"/><Stack.Screen name="onboarding" options={{gestureEnabled:false}}/></Stack>{error&&<Pressable accessibilityRole="button" accessibilityLabel="Retry saving changes" onPress={()=>void retry().catch(()=>{})} style={{backgroundColor:t.surface,padding:12}}><Text style={{color:'#D92D20',textAlign:'center',fontSize:12}}>{error} Tap to retry.</Text></Pressable>}{saving&&<View pointerEvents="none" style={{position:'absolute',top:5,right:10,backgroundColor:t.surface,borderRadius:8,paddingHorizontal:7,paddingVertical:3}}><Text style={{fontSize:9,color:t.muted}}>Saving…</Text></View>}</View>;
}
