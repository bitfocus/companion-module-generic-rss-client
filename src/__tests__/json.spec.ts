import { describe, expect, it } from 'vitest'
import Parser from 'rss-parser'
import { toJsonObject } from '../json.js'

/**
 * Hand-written, not a capture, run through the real rss-parser. The enclosure is the case to watch: xml2js builds it
 * from the element's attributes as an object with no prototype.
 */
const PODCAST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
<title>Example Podcast</title>
<itunes:owner><itunes:name>Jane Doe</itunes:name></itunes:owner>
<item>
<title>Episode 1</title>
<enclosure url="https://example.com/1.mp3" length="1024" type="audio/mpeg"/>
<category>Talk</category>
</item>
</channel>
</rss>`

describe('toJsonObject', () => {
	it('keeps everything rss-parser produces', async () => {
		const feed = await new Parser().parseString(PODCAST_XML)

		const { json, dropped } = toJsonObject(feed)

		expect(dropped).toEqual([])
		expect(json).toEqual(JSON.parse(JSON.stringify(feed)))
		expect(json).toMatchObject({
			items: [{ enclosure: { url: 'https://example.com/1.mp3', length: '1024', type: 'audio/mpeg' } }],
		})
	})

	it('leaves out properties that cannot be serialised, and reports their paths', () => {
		const { json, dropped } = toJsonObject({
			title: 'Example News',
			parse: () => 'feed',
			published: new Date(0),
			nested: { kept: 'yes', id: Symbol('id') },
		})

		expect(json).toStrictEqual({ title: 'Example News', nested: { kept: 'yes' } })
		expect(dropped).toEqual(['parse', 'published', 'nested.id'])
	})

	it('replaces an array element that cannot be serialised with null, so the rest keep their indices', () => {
		const { json, dropped } = toJsonObject({ items: [{ title: 'A' }, () => 'B', { title: 'C' }] })

		expect(json).toStrictEqual({ items: [{ title: 'A' }, null, { title: 'C' }] })
		expect(dropped).toEqual(['items.1'])
	})

	it('turns a BigInt into its decimal string, without reporting it', () => {
		// Past 2^53, where converting to a number would have rounded it
		const { json, dropped } = toJsonObject({ length: 9007199254740993n, sizes: [1n, -2n] })

		expect(json).toStrictEqual({ length: '9007199254740993', sizes: ['1', '-2'] })
		expect(dropped).toEqual([])
	})

	it('leaves out undefined without reporting it', () => {
		const { json, dropped } = toJsonObject({ title: undefined, items: [undefined] })

		expect(json).toStrictEqual({ items: [null] })
		expect(dropped).toEqual([])
	})

	it('leaves out a reference back up the tree, but keeps an object reached twice', () => {
		const shared = { name: 'shared' }
		const feed: Record<string, unknown> = { a: shared, b: shared, items: [] }
		;(feed.items as unknown[]).push({ parent: feed })

		const { json, dropped } = toJsonObject(feed)

		expect(json).toStrictEqual({ a: { name: 'shared' }, b: { name: 'shared' }, items: [{}] })
		expect(dropped).toEqual(['items.0.parent'])
	})
})
