import { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { flatten } from 'flat'

export const sanitiseVariableId = (id: string, substitute: '' | '.' | '-' | '_' = '_'): string =>
	id.replaceAll(/[^a-zA-Z0-9-_.]/gm, substitute)

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const flattenedRssFeed = flatten(self.rssResponse)
	const varDefs: CompanionVariableDefinition[] = []
	const varValues: CompanionVariableValues = {}
	for (const [key, value] of Object.entries(flattenedRssFeed as object)) {
		varDefs.push({ variableId: sanitiseVariableId(key), name: key })
		varValues[sanitiseVariableId(key)] = value
	}
	self.setVariableDefinitions(varDefs)
	self.setVariableValues(varValues)
}
