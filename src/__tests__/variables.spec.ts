import { describe, expect, it, vi } from 'vitest'
import Parser from 'rss-parser'
import type { CompanionVariableDefinitions, CompanionVariableValues } from '@companion-module/base'
import type ModuleInstance from '../main.js'
import { UpdateVariableDefinitions, type VariablesSchema } from '../variables.js'

/**
 * Companion drops, with only a log warning, any variable definition whose id fails this test. Copied from
 * VARIABLE_ID_REGEX in @companion-module/host's internal/util.js, as shipped with Companion 5.1.
 */
const COMPANION_VARIABLE_ID = /^([a-zA-Z0-9-_.!]+)$/

/**
 * A hand-written RSS 2.0 feed, not a capture. It is run through the real rss-parser below, so the keys are the ones
 * the parser produces. The namespaced elements (dc:creator, content:encoded) give keys with a colon, which is not
 * allowed in a variable id.
 */
const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Example News</title>
<link>https://example.com/</link>
<description>Headlines</description>
<item>
<title>First headline</title>
<link>https://example.com/1</link>
<dc:creator>Jane Doe</dc:creator>
<pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate>
<content:encoded><![CDATA[<p>Body <b>one</b></p>]]></content:encoded>
<category>World</category>
<category>Politics</category>
</item>
<item>
<title>Second headline</title>
<description>Plain summary</description>
</item>
</channel>
</rss>`

const EMPTY_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Quiet News</title><link>https://example.com/</link></channel></rss>`

function fakeInstance(rssResponse: unknown) {
	const self = {
		rssResponse,
		setVariableDefinitions: vi.fn<(variables: CompanionVariableDefinitions<VariablesSchema>) => void>(),
		setVariableValues: vi.fn<(values: CompanionVariableValues) => void>(),
	}
	UpdateVariableDefinitions(self as unknown as ModuleInstance)
	return {
		definitions: self.setVariableDefinitions.mock.calls[0][0],
		values: self.setVariableValues.mock.calls[0][0],
	}
}

describe('UpdateVariableDefinitions', () => {
	it('defines a variable for every flattened key of the feed', async () => {
		const { definitions, values } = fakeInstance(await new Parser().parseString(FEED_XML))

		// API 2.x takes an object keyed by variable id. Base throws on the array 1.x took
		expect(Array.isArray(definitions)).toBe(false)
		expect(definitions).toMatchObject({
			title: { name: 'title' },
			'items.0.title': { name: 'items.0.title' },
			'items.0.categories.1': { name: 'items.0.categories.1' },
			'items.1.contentSnippet': { name: 'items.1.contentSnippet' },
		})
		expect(values).toMatchObject({
			title: 'Example News',
			'items.0.title': 'First headline',
			'items.0.categories.1': 'Politics',
			'items.0.isoDate': '2026-10-12T08:00:00.000Z',
			'items.1.contentSnippet': 'Plain summary',
		})
	})

	it('sanitises ids Companion would reject, keeping the original key as the name', async () => {
		const { definitions, values } = fakeInstance(await new Parser().parseString(FEED_XML))

		expect(definitions['items.0.content_encoded']).toEqual({ name: 'items.0.content:encoded' })
		expect(definitions['items.0.dc_creator']).toEqual({ name: 'items.0.dc:creator' })
		expect(values['items.0.content_encoded']).toBe('<p>Body <b>one</b></p>')

		for (const id of Object.keys(definitions)) expect(id).toMatch(COMPANION_VARIABLE_ID)
	})

	it('gives every value a definition', async () => {
		// Companion discards a value whose id has no definition, so the two must stay in step
		const { definitions, values } = fakeInstance(await new Parser().parseString(FEED_XML))

		expect(Object.keys(values).sort()).toEqual(Object.keys(definitions).sort())
	})

	it('defines nothing before the first fetch', () => {
		const { definitions, values } = fakeInstance(undefined)

		expect(definitions).toEqual({})
		expect(values).toEqual({})
	})

	it('keeps an empty list as a list', async () => {
		// flatten leaves an empty array as a value rather than descending into it, as here for a feed with no items
		const { values } = fakeInstance(await new Parser().parseString(EMPTY_FEED_XML))

		expect(values).toEqual({ title: 'Quiet News', link: 'https://example.com/', items: [] })
	})
})
