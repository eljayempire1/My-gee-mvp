import Script from "next/script";
import type {ReactNode} from "react";

export default function MessagesLayout({children}:{children:ReactNode}){
  return <>
    {children}
    <Script id="gee-elijah-chat-avatar-fix" strategy="afterInteractive">{`(()=>{const src="/elijah-obonogwu-avatar.svg";const fix=()=>{const chat=document.querySelector('.chat');if(!chat)return;const name=chat.querySelector('.person strong')?.textContent?.trim().toLowerCase();if(name?.includes('elijah'))chat.querySelectorAll('img.avatar,img.messageAvatar,img').forEach((img)=>{if(img.src!==location.origin+src)img.src=src})};fix();new MutationObserver(fix).observe(document.body,{childList:true,subtree:true,characterData:true});})();`}</Script>
  </>;
}
