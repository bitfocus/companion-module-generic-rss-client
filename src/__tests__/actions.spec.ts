import { describe, expect, it, vi } from 'vitest'
import type { CompanionActionDefinitions, JsonObject } from '@companion-module/base'
import type ModuleInstance from '../main.js'
import { ActionId, UpdateActions, type ActionSchema } from '../actions.js'

function updateFeedAction(updateFeed: () => Promise<unknown>) {
	const self = {
		updateFeed: vi.fn(updateFeed),
		setActionDefinitions: vi.fn<(actions: CompanionActionDefinitions<ActionSchema>) => void>(),
	}
	UpdateActions(self as unknown as ModuleInstance)
	const actions = self.setActionDefinitions.mock.calls[0][0]
	const action = actions[ActionId.UpdateFeed]
	if (!action) throw new Error('update_feed is not defined')
	return { self, actions, run: async () => action.callback({} as never, {} as never) }
}

const FEED: JsonObject = { title: 'Example News', items: [{ title: 'First headline', categories: ['World'] }] }

describe('UpdateActions', () => {
	it('keeps the action id already saved on buttons', () => {
		const { actions } = updateFeedAction(async () => FEED)

		expect(Object.keys(actions)).toEqual(['update_feed'])
	})

	it('returns the fetched feed as its result', async () => {
		const { self, run } = updateFeedAction(async () => FEED)

		expect(await run()).toBe(FEED)
		expect(self.updateFeed).toHaveBeenCalledOnce()
	})

	it('fails when the fetch fails', async () => {
		// Companion only stores a result from an action that succeeds, so a failed fetch leaves the last one in place
		const { run } = updateFeedAction(async () => Promise.reject(new Error('Status code 404')))

		await expect(run()).rejects.toThrow('Status code 404')
	})
})
