import * as htmlparser2 from 'htmlparser2';

export interface Env {
	KV: KVNamespace;
	TELEGRAM_TOKEN: string;
}

export default {
	scheduled: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
		const telegram_message = (text: string) =>
			new URL(
				`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage?` + new URLSearchParams({ chat_id: '@canadanewschannel', text })
			);
		const rss = [
			'https://www.cbc.ca/webfeed/rss/rss-canada',
			'http://ctvnews.ca/rss/Canada',
			'https://globalnews.ca/feed/',
			'https://www.theguardian.com/world/canada/rss',
		];
		await Promise.all(
			rss.map(async (url) => {
				const response = await fetch(url);
				const text = await response.text();
				const feed = htmlparser2.parseFeed(text);
				const last = feed?.items[0] ?? { link: '' };
				const last_kv = await env.KV.get(url);
				if (last.link !== last_kv && last.link !== '') {
					const send_message = telegram_message(last.link ?? '');
					const response = await fetch(send_message);
					console.log(await response.text());
					await env.KV.put(url, last.link ?? '');
				}
			})
		);
		return new Response('ok');
	},
};
