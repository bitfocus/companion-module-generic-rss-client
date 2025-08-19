import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
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
