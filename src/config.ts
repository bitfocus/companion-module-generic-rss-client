import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

// A type alias, not an interface: InstanceTypes requires config to satisfy JsonObject, and interfaces don't
export type ModuleConfig = {
	feed: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'feed',
			label: 'Feed URL',
			width: 8,
			regex: Regex.SOMETHING,
		},
	]
}
