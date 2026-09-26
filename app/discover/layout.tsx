import Script from "next/script";
import type {ReactNode} from "react";

export default function DiscoverLayout({children}:{children:ReactNode}){
  return <>
    {children}
    <Script id="gee-elijah-avatar-fix" strategy="afterInteractive">{`(()=>{const src="https://raw.githubusercontent.com/eljayempire1/My-gee-mvp/main/public/elijah-obonogwu-avatar.svg";const fix=()=>document.querySelectorAll('img[alt="Elijah OBONOGWU profile"]').forEach((img)=>{if(img.src!==src)img.src=src});fix();new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});})();`}</Script>
  </>;
}
