import { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export enum ActionId {
	UpdateFeed = 'update_feed',
}

export function UpdateActions(self: ModuleInstance): void {
	const actions: { [id in ActionId]: CompanionActionDefinition } = {
		[ActionId.UpdateFeed]: {
			name: 'Update Feed',
			options: [],
			callback: async (_event, _context) => {
				await self.updateFeed()
			},
		},
	}

	self.setActionDefinitions(actions)
}
