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
				onClick={(e) => {
					try {
						// Google Analytics gtag event for share (for direct GA4 event tracking)
						const method = platform === "whatsapp" ? "Whatsapp" : "Twitter";
						const value = snippetWithStars ? snippetWithStars.replace("WhatsApp!", "") : "";
						const hash_tags = hashtagsStr || "";
						const item_id = pagePath || "";
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
							try {
								const g = (window as any).gtag;
								if (typeof g === "function") {
									g("event", "share", payload);
									console.log("gtag called for share event");
								} else {
									console.warn("gtag function not found on window");
								}
							} catch (innerErr) {
								console.error("Error calling gtag:", innerErr);
							}
						}
					} catch (err) {
						console.error("ShareButton onClick error:", err);
					}
				}}
			>
				{children}
			</a>
		);
}
