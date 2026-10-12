import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import Parser from 'rss-parser'
import ModuleInstance from '../main.js'
import { ActionId } from '../actions.js'

// Enough of InstanceBase to construct the module without a Companion host
vi.mock('@companion-module/base', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@companion-module/base')>()
	class InstanceBase {
		constructor(_internal: unknown) {}
		log(): void {}
		updateStatus(): void {}
		setActionDefinitions(): void {}
		setFeedbackDefinitions(): void {}
		setVariableDefinitions(): void {}
		setVariableValues(): void {}
	}
	return { ...actual, InstanceBase }
})

/** Hand-written, not a capture. Served below so the real rss-parser fetches and parses it */
const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>Example News</title>
<link>https://example.com/</link>
<item>
<title>First headline</title>
<dc:creator>Jane Doe</dc:creator>
<category>World</category>
</item>
</channel>
</rss>`

// A local server, so the responses and errors are the ones the real rss-parser gives, without reaching the network
let server: Server
let baseUrl: string

beforeAll(async () => {
	server = createServer((req, res) => {
		if (req.url === '/feed') {
			res.writeHead(200, { 'Content-Type': 'application/rss+xml' }).end(FEED_XML)
		} else if (req.url === '/missing') {
			res.writeHead(404).end()
		} else {
			res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html><body>Not a feed</body></html>')
		}
	})
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
	await new Promise((resolve) => server.close(resolve))
})

describe('update feed action', () => {
	it('returns the whole feed, in a form that survives the trip to Companion', async () => {
		const instance = new ModuleInstance({})
		instance.config = { feed: `${baseUrl}/feed` }
		const setActionDefinitions = vi.spyOn(instance, 'setActionDefinitions')
		instance.updateActions()
		const action = setActionDefinitions.mock.calls[0][0][ActionId.UpdateFeed]
		if (!action) throw new Error('update_feed is not defined')

		const result = await action.callback({} as never, {} as never)

		expect(result).toEqual({
			title: 'Example News',
			link: 'https://example.com/',
			items: [{ title: 'First headline', creator: 'Jane Doe', 'dc:creator': 'Jane Doe', categories: ['World'] }],
		})
		// Companion receives the result serialised as JSON
		expect(JSON.parse(JSON.stringify(result))).toEqual(result)
		expect(instance.rssResponse).toBe(result)
	})
})

describe('updateFeed', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('cleans the feed once, for both the variables and the result', async () => {
		// Neither is something rss-parser produces today, hence the stub
		vi.spyOn(Parser.prototype, 'parseURL').mockResolvedValue({
			title: 'Example News',
			items: [{ title: 'A', size: 10n, parse: () => 'A' }],
		})
		const instance = new ModuleInstance({})
		const log = vi.spyOn(instance, 'log')
		const setVariableValues = vi.spyOn(instance, 'setVariableValues')

		const feed = await instance.updateFeed(`${baseUrl}/feed`)

		expect(feed).toStrictEqual({ title: 'Example News', items: [{ title: 'A', size: '10' }] })
		expect(setVariableValues).toHaveBeenCalledExactlyOnceWith({
			title: 'Example News',
			'items.0.title': 'A',
			'items.0.size': '10',
		})
		expect(log.mock.calls.filter(([level]) => level === 'warn')).toEqual([
			['warn', 'Left out of the feed, as they cannot be sent to Companion as JSON: items.0.parse'],
		])
	})
})

describe('updateFeed errors', () => {
	async function errorsLogged(url: string): Promise<string[]> {
		const instance = new ModuleInstance({})
		const log = vi.spyOn(instance, 'log')
		await expect(instance.updateFeed(url)).rejects.toThrow()
		return log.mock.calls.filter(([level]) => level === 'error').map(([, message]) => message)
	}

	it('logs why an HTTP error failed', async () => {
		expect(await errorsLogged(`${baseUrl}/missing`)).toEqual(['Feed update failed: Status code 404'])
	})

	it('logs why a response that is not a feed failed', async () => {
		expect(await errorsLogged(`${baseUrl}/page`)).toEqual(['Feed update failed: Feed not recognized as RSS 1 or 2.'])
	})
})
