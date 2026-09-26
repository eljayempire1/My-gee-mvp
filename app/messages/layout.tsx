import Script from "next/script";
import type {ReactNode} from "react";

export default function MessagesLayout({children}:{children:ReactNode}){
  return <>
    {children}
    <Script id="gee-elijah-chat-fix-v4" strategy="afterInteractive">{`(()=>{const avatar="/elijah-obonogwu-avatar.svg?v=4";const pidgin=new Map([[
"Yeah, I hear you 💜 There's a lot in that, and I'm following.","Yeah, I hear you 💜 E get plenty for that, and I dey follow you."],[
"Hmm… okay, I get what you're saying. That actually makes sense.","Hmm… okay, I get wetin you dey talk. E make sense sha."],[
"Yeah, I can see why that would stay on your mind.","Yeah, I fit see why that one go dey your mind."],[
"Ahh, now I see the picture a bit better. I'm with you.","Ahh, now I see the matter better. I dey with you."],[
"Right… I'm following you. Keep going if there's more to it.","Okay… I dey follow you. If anything dey still your mind, talk am."],[
"I get you. Let's not rush past that part.","I get you. Make we no rush pass that part."],[
"Yeah, I'm with you. No rush — keep going when you're ready.","Yeah, I dey with you. No rush — talk when you ready."],[
"Yeah 😄 I'm with you. Take your time.","Yeah 😄 I dey with you. Take your time."],[
"I'm with you 💜 No rush.","I dey with you 💜 No rush."]]);const fix=()=>{const chat=document.querySelector('.chat');if(!chat)return;const name=chat.querySelector('.person strong')?.textContent?.trim().toLowerCase();if(!name?.includes('elijah'))return;chat.querySelectorAll('img.avatar,img.messageAvatar').forEach((img)=>{if(!img.src.includes('/elijah-obonogwu-avatar.svg'))img.src=avatar});chat.querySelectorAll('.row:not(.mine) .bubble').forEach((b)=>{const raw=b.textContent?.trim()||'';const replacement=pidgin.get(raw);if(replacement&&!b.dataset.pidginFixed){const small=b.querySelector('small');b.childNodes.forEach((n)=>{if(n.nodeType===Node.TEXT_NODE)n.textContent=''});b.insertBefore(document.createTextNode(replacement),small||null);b.dataset.pidginFixed='1'}})};fix();new MutationObserver(fix).observe(document.body,{childList:true,subtree:true,characterData:true});})();`}</Script>
  </>;
}
