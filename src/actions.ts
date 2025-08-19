import type { ModuleInstance } from './main.js'

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		sample_action: {
			name: 'Update Feed',
			options: [],
			callback: async (_event, _context) => {
				await self.updateFeed()
			},
		},
	})
}
