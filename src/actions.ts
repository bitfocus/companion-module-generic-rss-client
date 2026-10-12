import type { CompanionActionDefinitions, JsonObject } from '@companion-module/base'
import type ModuleInstance from './main.js'

export enum ActionId {
	UpdateFeed = 'update_feed',
}

export type ActionSchema = {
	[ActionId.UpdateFeed]: { options: Record<string, never>; result: JsonObject }
}

export function UpdateActions(self: ModuleInstance): void {
	const actions: CompanionActionDefinitions<ActionSchema> = {
		[ActionId.UpdateFeed]: {
			name: 'Update Feed',
			description: 'Fetch the feed, update the variables, and return the whole feed as the action result',
			options: [],
			hasResult: true,
			// A failed fetch throws, which leaves a stored result as it was, where returning would overwrite it
			callback: async (_event, _context) => await self.updateFeed(),
		},
	}

	self.setActionDefinitions(actions)
}
