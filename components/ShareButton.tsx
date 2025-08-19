"use client";

import React from "react";

export function ShareButton({
	href,
	platform,
	children,
	snippetWithStars,
	hashtagsStr,
	pagePath,
	itemCat,
	...props
}: {
	href: string;
	platform: "twitter" | "whatsapp";
	children: React.ReactNode;
	snippetWithStars: string;
	hashtagsStr: string;
	pagePath: string;
	itemCat?: string;
	[key: string]: any;
}) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				{...props}
				onClick={() => {
					// Google Analytics gtag event for share (for direct GA4 event tracking)
					const method = platform === "whatsapp" ? "Whatsapp" : "Twitter";
					const value = snippetWithStars.replace("WhatsApp!", "");
					const hash_tags = hashtagsStr;
					const item_id = pagePath;
					const payload = {
						method,
						content_type: "text",
						item_id,
						value,
						hash_tags,
						item_cat: itemCat || undefined,
					};
					// Always log the payload
					if (typeof window !== "undefined") {
						console.log("Share event payload:", payload);
						if (typeof (window as any).gtag === "function") {
							(window as any).gtag("event", "share", payload);
						} else {
							console.warn("gtag function not found on window");
						}
					}
				}}
			>
				{children}
			</a>
		);
}
