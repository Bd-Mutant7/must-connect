import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, StatusBar, BackHandler, Platform,
  ActivityIndicator, Text, TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [htmlContent, setHtmlContent] = useState(null);
  const [appReady, setAppReady]       = useState(false);
  const [loadError, setLoadError]     = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => { loadHTML(); }, []);

  async function loadHTML() {
    try {
      if (Platform.OS === 'android') {
        await NavigationBar.setBackgroundColorAsync('#050b14');
        await NavigationBar.setButtonStyleAsync('light');
      }
      // Load bundled HTML asset and read it as a plain STRING
      const asset = Asset.fromModule(require('./assets/app.html'));
      await asset.downloadAsync();
      const content = await FileSystem.readAsStringAsync(asset.localUri);
      setHtmlContent(content);
    } catch (err) {
      console.error('Load error:', err);
      setLoadError(err.message || 'Load failed');
      await SplashScreen.hideAsync();
    }
  }

  async function onLoad() {
    setAppReady(true);
    await SplashScreen.hideAsync();
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Injected BEFORE page loads — basic height fix
  const PRE_JS = `
    (function(){
      var s=document.createElement('style');
      s.textContent='html,body{width:100%!important;height:100%!important;overflow:hidden!important}#app{height:100%!important;max-height:100%!important}';
      document.head&&document.head.appendChild(s);
      true;
    })();
  `;

  // Injected AFTER page loads — keyboard + height fixes
  const POST_JS = `
    (function(){
      function setH(){
        var h=window.visualViewport?window.visualViewport.height:window.innerHeight;
        var a=document.getElementById('app');
        if(a){a.style.height=h+'px';a.style.maxHeight=h+'px';}
        document.body.style.height=h+'px';
      }
      setH();
      if(window.visualViewport)window.visualViewport.addEventListener('resize',setH);
      window.addEventListener('resize',setH);
      document.addEventListener('focusin',function(e){
        if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')){
          setTimeout(function(){e.target.scrollIntoView({behavior:'smooth',block:'center'});},400);
        }
      });
      true;
    })();
  `;

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>Could not load MUST Connect{'\n'}{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadHTML}>
          <Text style={styles.retryTxt}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#050b14" translucent={false}/>
        {!appReady && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#E8A020"/>
            <Text style={styles.loaderTxt}>Loading MUST Connect…</Text>
          </View>
        )}
        {htmlContent && (
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent, baseUrl: 'http://localhost' }}
            style={[styles.wv, !appReady && styles.hidden]}
            onLoad={onLoad}
            injectedJavaScriptBeforeContentLoaded={PRE_JS}
            injectedJavaScript={POST_JS}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            cacheEnabled={false}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardDisplayRequiresUserAction={false}
            automaticallyAdjustContentInsets={false}
            contentInset={{top:0,bottom:0}}
            onError={e=>console.warn('WV error',JSON.stringify(e.nativeEvent))}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:     { flex:1, backgroundColor:'#050b14' },
  wv:       { flex:1, backgroundColor:'#050b14' },
  hidden:   { opacity:0, position:'absolute', width:0, height:0 },
  loader:   { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#050b14', gap:16 },
  loaderTxt:{ color:'rgba(255,255,255,0.45)', fontSize:14 },
  center:   { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#050b14', padding:32 },
  errText:  { color:'#fff', fontSize:14, textAlign:'center', marginBottom:24 },
  retryBtn: { backgroundColor:'#1B4F8A', paddingHorizontal:32, paddingVertical:12, borderRadius:40 },
  retryTxt: { color:'#fff', fontWeight:'700', fontSize:14 },
});
